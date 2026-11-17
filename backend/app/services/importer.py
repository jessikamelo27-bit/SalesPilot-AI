import hashlib
import io
import json
import unicodedata
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import ImportBatch, SaleRecord
from app.schemas import ImportPreviewResponse, QualitySummary, RowIssue


COLUMN_ALIASES: Dict[str, List[str]] = {
    "sale_date": ["data da venda", "data_venda", "data", "sale_date", "date", "dt_venda", "data_pedido"],
    "order_id": [
        "numero do pedido",
        "numero_pedido",
        "pedido",
        "id_pedido",
        "order_id",
        "order",
        "num_pedido",
        "codigo_pedido",
    ],
    "product": ["produto", "nome do produto", "nome_produto", "product", "item", "descricao"],
    "category": ["categoria", "category", "grupo", "departamento", "linha"],
    "quantity": ["quantidade vendida", "quantidade_vendida", "quantidade", "qtd", "quantity", "qty"],
    "unit_price": [
        "preco unitario",
        "preco_unitario",
        "preco",
        "unit_price",
        "price",
        "valor unitario",
        "valor_unitario",
    ],
    "discount": ["desconto", "discount", "valor desconto", "valor_desconto", "desc"],
    "unit_cost": [
        "custo do produto",
        "custo_produto",
        "custo unitario",
        "custo_unitario",
        "custo",
        "unit_cost",
        "cost",
        "preco_custo",
    ],
    "salesperson": ["vendedor", "consultor", "representante", "salesperson", "seller", "executivo"],
    "region": ["regiao", "region", "uf", "estado", "regional"],
    "payment_method": [
        "forma de pagamento",
        "forma_pagamento",
        "pagamento",
        "payment_method",
        "meio_pagamento",
        "payment",
    ],
}

REQUIRED_FIELDS = [
    "sale_date",
    "order_id",
    "product",
    "category",
    "quantity",
    "unit_price",
    "salesperson",
    "region",
]

FIELD_LABELS_PT = {
    "sale_date": "Data da venda",
    "order_id": "Número do pedido",
    "product": "Produto",
    "category": "Categoria",
    "quantity": "Quantidade vendida",
    "unit_price": "Preço unitário",
    "discount": "Desconto",
    "unit_cost": "Custo do produto",
    "salesperson": "Vendedor",
    "region": "Região",
    "payment_method": "Forma de pagamento",
}


def normalize_col_name(col: Any) -> str:
    """Normalizes column names by removing accents, lowercasing, and trimming whitespace."""
    text = str(col).strip().lower()
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    return " ".join(text.replace("_", " ").split())


def map_columns(raw_columns: List[str]) -> Tuple[Dict[str, str], List[str]]:
    """
    Maps user spreadsheet column names to canonical schema fields.
    Returns (canonical_to_original_map, missing_required_fields_in_pt).
    """
    norm_to_orig = {normalize_col_name(c): str(c) for c in raw_columns}
    mapped: Dict[str, str] = {}

    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            norm_alias = normalize_col_name(alias)
            if norm_alias in norm_to_orig:
                mapped[canonical] = norm_to_orig[norm_alias]
                break

    missing_pt = [FIELD_LABELS_PT[req] for req in REQUIRED_FIELDS if req not in mapped]
    return mapped, missing_pt


def parse_number(val: Any) -> Optional[float]:
    """Parses numeric values handling both US (1,234.56) and BR (1.234,56) formats as well as R$ currency strings."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, (int, float, np.number)):
        return float(val)
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "null", "-", "n/a"):
        return None
    s = s.replace("R$", "").replace("$", "").replace(" ", "")
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_date_value(val: Any) -> Optional[date]:
    """Parses dates from ISO, DD/MM/YYYY, or datetime objects."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, pd.Timestamp):
        if pd.isna(val):
            return None
        return val.date()
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "null", "nat", "-"):
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    try:
        parsed = pd.to_datetime(s, dayfirst=True, errors="raise")
        if pd.isna(parsed):
            return None
        return parsed.date()
    except Exception:
        return None


def compute_row_hash(order_id: str, product: str, sale_date_str: str, quantity: float, unit_price: float) -> str:
    """Computes a deterministic hash to identify duplicate commercial records."""
    payload = f"{order_id.strip().lower()}|{product.strip().lower()}|{sale_date_str}|{quantity:.4f}|{unit_price:.4f}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def read_uploaded_dataframe(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Reads CSV or XLSX file bytes into a raw Pandas DataFrame."""
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        # Try utf-8-sig first, fallback to latin-1, and auto-detect separator (, or ;)
        text_content = None
        for enc in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                text_content = file_bytes.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if text_content is None:
            raise ValueError("Não foi possível decodificar o arquivo CSV. Verifique a codificação (UTF-8 ou Latin-1).")

        first_line = text_content.splitlines()[0] if text_content.splitlines() else ""
        sep = ";" if first_line.count(";") > first_line.count(",") else ","
        return pd.read_csv(io.StringIO(text_content), sep=sep, dtype=object)

    elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
        return pd.read_excel(io.BytesIO(file_bytes), dtype=object)
    else:
        raise ValueError("Formato de arquivo não suportado. Envie apenas arquivos .CSV ou .XLSX.")


def analyze_and_stage_import(
    db: Session,
    file_bytes: bytes,
    filename: str,
) -> ImportPreviewResponse:
    """
    Executes the 10-step import & data quality pipeline without silently discarding records.
    Stages valid records in ImportBatch so the user can review the preview & quality report
    before confirming or cancelling.
    """
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Check if this exact file was already confirmed
    existing_batch = db.execute(
        select(ImportBatch).where(
            ImportBatch.file_hash == file_hash,
            ImportBatch.status == "confirmed",
        )
    ).scalars().first()
    is_duplicate_file = existing_batch is not None

    df_raw = read_uploaded_dataframe(file_bytes, filename)
    raw_columns = [str(c) for c in df_raw.columns.tolist()]
    mapped_cols, missing_cols_pt = map_columns(raw_columns)

    has_cost_column = "unit_cost" in mapped_cols
    issues: List[RowIssue] = []
    issue_counts: Dict[str, int] = {}

    def register_issue(row_num: int, field_pt: str, issue_type: str, severity: str, desc: str, raw_val: Any = None):
        issue_counts[issue_type] = issue_counts.get(issue_type, 0) + 1
        issues.append(
            RowIssue(
                row_number=row_num,
                field=field_pt,
                issue_type=issue_type,
                severity=severity,
                description=desc,
                raw_value=str(raw_val) if raw_val is not None else None,
            )
        )

    # Fetch existing row hashes and order_id+product pairs from DB to detect duplicates
    existing_hashes = set(db.execute(select(SaleRecord.row_hash)).scalars().all())
    existing_orders = set(
        db.execute(select(SaleRecord.order_id, SaleRecord.product)).all()
    )

    valid_records: List[Dict[str, Any]] = []
    preview_rows: List[Dict[str, Any]] = []
    seen_in_file_orders: set = set()
    duplicate_rows_count = 0
    already_imported_count = 0
    invalid_rows_count = 0

    if missing_cols_pt:
        for col_pt in missing_cols_pt:
            register_issue(
                row_num=0,
                field_pt=col_pt,
                issue_type="coluna_obrigatoria_ausente",
                severity="error",
                desc=f"A coluna obrigatória '{col_pt}' não foi encontrada na planilha.",
            )
    else:
        for idx, row in df_raw.iterrows():
            # Spreadsheet row number (1-indexed + header = idx + 2)
            row_num = int(idx) + 2
            row_has_error = False

            raw_date = row.get(mapped_cols["sale_date"])
            raw_order = row.get(mapped_cols["order_id"])
            raw_product = row.get(mapped_cols["product"])
            raw_category = row.get(mapped_cols["category"])
            raw_qty = row.get(mapped_cols["quantity"])
            raw_price = row.get(mapped_cols["unit_price"])
            raw_discount = row.get(mapped_cols["discount"]) if "discount" in mapped_cols else 0.0
            raw_cost = row.get(mapped_cols["unit_cost"]) if has_cost_column else None
            raw_salesperson = row.get(mapped_cols["salesperson"])
            raw_region = row.get(mapped_cols["region"])
            raw_payment = row.get(mapped_cols["payment_method"]) if "payment_method" in mapped_cols else "Não informado"

            # 1. Validate Date
            parsed_date = parse_date_value(raw_date)
            if parsed_date is None:
                row_has_error = True
                register_issue(
                    row_num,
                    "Data da venda",
                    "venda_sem_data_ou_invalida",
                    "error",
                    "Venda sem data ou com formato de data inválido. Informe uma data válida (ex: AAAA-MM-DD ou DD/MM/AAAA).",
                    raw_date,
                )

            # 2. Validate Order ID
            order_str = "" if (raw_order is None or pd.isna(raw_order)) else str(raw_order).strip()
            if not order_str or order_str.lower() in ("nan", "none"):
                row_has_error = True
                register_issue(
                    row_num,
                    "Número do pedido",
                    "pedido_sem_identificacao",
                    "error",
                    "Registro sem número de pedido.",
                    raw_order,
                )

            # 3. Validate Product
            product_str = "" if (raw_product is None or pd.isna(raw_product)) else str(raw_product).strip()
            if not product_str or product_str.lower() in ("nan", "none"):
                row_has_error = True
                register_issue(
                    row_num,
                    "Produto",
                    "produto_sem_identificacao",
                    "error",
                    "Produto sem identificação. Preencha o nome do produto.",
                    raw_product,
                )

            # 4. Validate Category
            category_str = "" if (raw_category is None or pd.isna(raw_category)) else str(raw_category).strip()
            if not category_str or category_str.lower() in ("nan", "none"):
                row_has_error = True
                register_issue(
                    row_num,
                    "Categoria",
                    "categoria_ausente",
                    "error",
                    "Registro sem categoria informada.",
                    raw_category,
                )

            # 5. Validate Quantity
            qty_val = parse_number(raw_qty)
            if qty_val is None:
                row_has_error = True
                register_issue(
                    row_num,
                    "Quantidade vendida",
                    "quantidade_invalida",
                    "error",
                    "Quantidade ausente ou não numérica.",
                    raw_qty,
                )
            elif qty_val <= 0:
                row_has_error = True
                register_issue(
                    row_num,
                    "Quantidade vendida",
                    "quantidade_negativa_ou_zero",
                    "error",
                    f"Quantidade vendida inválida ({qty_val}). A quantidade deve ser maior que zero.",
                    raw_qty,
                )

            # 6. Validate Unit Price
            price_val = parse_number(raw_price)
            if price_val is None or price_val <= 0:
                row_has_error = True
                register_issue(
                    row_num,
                    "Preço unitário",
                    "preco_unitario_invalido",
                    "error",
                    "Preço unitário ausente, zero ou negativo. Informe um valor positivo.",
                    raw_price,
                )

            # 7. Validate Discount
            discount_val = parse_number(raw_discount)
            if discount_val is None:
                discount_val = 0.0
            if discount_val < 0:
                row_has_error = True
                register_issue(
                    row_num,
                    "Desconto",
                    "desconto_negativo",
                    "error",
                    "O desconto não pode ser um valor negativo.",
                    raw_discount,
                )
            elif qty_val is not None and price_val is not None and qty_val > 0 and price_val > 0:
                gross = qty_val * price_val
                # Maximum allowed discount is 50% of gross value (and never > gross value)
                if discount_val > gross * 0.50:
                    row_has_error = True
                    register_issue(
                        row_num,
                        "Desconto",
                        "desconto_superior_ao_permitido",
                        "error",
                        f"Desconto (R$ {discount_val:.2f}) superior ao limite comercial permitido (50% do valor bruto de R$ {gross:.2f}).",
                        raw_discount,
                    )

            # 8. Validate Unit Cost (if column exists)
            cost_val: Optional[float] = None
            if has_cost_column:
                cost_val = parse_number(raw_cost)
                if cost_val is not None and cost_val < 0:
                    row_has_error = True
                    register_issue(
                        row_num,
                        "Custo do produto",
                        "custo_invalido",
                        "error",
                        "Custo unitário negativo não é permitido.",
                        raw_cost,
                    )

            # 9. Validate Salesperson
            salesperson_str = "" if (raw_salesperson is None or pd.isna(raw_salesperson)) else str(raw_salesperson).strip()
            if not salesperson_str or salesperson_str.lower() in ("nan", "none"):
                row_has_error = True
                register_issue(
                    row_num,
                    "Vendedor",
                    "registro_sem_vendedor",
                    "error",
                    "Registro sem vendedor identificado.",
                    raw_salesperson,
                )

            # 10. Validate Region
            region_str = "" if (raw_region is None or pd.isna(raw_region)) else str(raw_region).strip()
            if not region_str or region_str.lower() in ("nan", "none"):
                row_has_error = True
                register_issue(
                    row_num,
                    "Região",
                    "registro_sem_regiao",
                    "error",
                    "Registro sem região informada.",
                    raw_region,
                )

            payment_str = "Não informado" if (raw_payment is None or pd.isna(raw_payment) or not str(raw_payment).strip()) else str(raw_payment).strip()

            # Check duplicates if basic keys exist
            is_dup = False
            if order_str and product_str:
                order_key = (order_str.lower(), product_str.lower())
                if order_key in seen_in_file_orders:
                    is_dup = True
                    duplicate_rows_count += 1
                    register_issue(
                        row_num,
                        "Número do pedido",
                        "pedido_duplicado",
                        "error",
                        f"Pedido '{order_str}' para o produto '{product_str}' está duplicado dentro da própria planilha.",
                        order_str,
                    )
                else:
                    seen_in_file_orders.add(order_key)

                if not is_dup and parsed_date and qty_val and price_val:
                    r_hash = compute_row_hash(order_str, product_str, parsed_date.isoformat(), qty_val, price_val)
                    if r_hash in existing_hashes or (order_str, product_str) in existing_orders:
                        is_dup = True
                        already_imported_count += 1
                        duplicate_rows_count += 1
                        register_issue(
                            row_num,
                            "Número do pedido",
                            "pedido_ja_importado",
                            "warning",
                            f"O pedido '{order_str}' ({product_str}) já consta na base de dados e foi bloqueado contra importação duplicada.",
                            order_str,
                        )

            row_status = "valido"
            if row_has_error:
                invalid_rows_count += 1
                row_status = "invalido"
            elif is_dup:
                row_status = "duplicado"
            else:
                r_hash = compute_row_hash(order_str, product_str, parsed_date.isoformat(), qty_val, price_val)
                valid_records.append(
                    {
                        "sale_date": parsed_date.isoformat(),
                        "order_id": order_str,
                        "product": product_str,
                        "category": category_str,
                        "quantity": round(qty_val, 4),
                        "unit_price": round(price_val, 2),
                        "discount": round(discount_val, 2),
                        "unit_cost": round(cost_val, 2) if cost_val is not None else None,
                        "salesperson": salesperson_str,
                        "region": region_str,
                        "payment_method": payment_str,
                        "row_hash": r_hash,
                    }
                )

            if len(preview_rows) < 25:
                preview_rows.append(
                    {
                        "row_number": row_num,
                        "sale_date": parsed_date.isoformat() if parsed_date else str(raw_date or ""),
                        "order_id": order_str or str(raw_order or ""),
                        "product": product_str or str(raw_product or ""),
                        "category": category_str or str(raw_category or ""),
                        "quantity": qty_val if qty_val is not None else str(raw_qty or ""),
                        "unit_price": price_val if price_val is not None else str(raw_price or ""),
                        "discount": discount_val,
                        "unit_cost": cost_val,
                        "salesperson": salesperson_str or str(raw_salesperson or ""),
                        "region": region_str or str(raw_region or ""),
                        "payment_method": payment_str,
                        "status": row_status,
                    }
                )

    quality = QualitySummary(
        total_rows_read=len(df_raw),
        valid_rows_count=len(valid_records),
        invalid_rows_count=invalid_rows_count,
        duplicate_rows_count=duplicate_rows_count,
        already_imported_rows_count=already_imported_count,
        has_cost_column=has_cost_column,
        missing_columns=missing_cols_pt,
        detected_columns=raw_columns,
        mapped_columns=mapped_cols,
        issue_counts_by_type=issue_counts,
        issues=issues,
    )

    batch = ImportBatch(
        filename=filename,
        file_hash=file_hash,
        total_rows=len(df_raw),
        valid_rows=len(valid_records),
        invalid_rows=invalid_rows_count,
        duplicate_rows=duplicate_rows_count,
        has_cost_column=has_cost_column,
        is_demo=False,
        status="pending",
        quality_report_json=quality.model_dump_json(),
        staged_records_json=json.dumps(valid_records),
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    can_import = len(valid_records) > 0 and not missing_cols_pt and not is_duplicate_file

    return ImportPreviewResponse(
        batch_id=batch.id,
        filename=filename,
        file_hash=file_hash,
        is_duplicate_file=is_duplicate_file,
        can_import=can_import,
        records_to_import=len(valid_records),
        quality=quality,
        preview_rows=preview_rows,
    )


def confirm_import_batch(db: Session, batch_id: int) -> Dict[str, Any]:
    """Confirms a staged import batch and persists its validated records into sale_records."""
    batch = db.get(ImportBatch, batch_id)
    if not batch:
        raise ValueError("Lote de importação não encontrado.")
    if batch.status == "confirmed":
        raise ValueError("Este lote de importação já foi confirmado anteriormente.")
    if batch.status == "cancelled":
        raise ValueError("Este lote de importação foi cancelado e não pode ser confirmado.")

    # Verify duplicate file hash again
    dup_batch = db.execute(
        select(ImportBatch).where(
            ImportBatch.file_hash == batch.file_hash,
            ImportBatch.status == "confirmed",
            ImportBatch.id != batch.id,
        )
    ).scalars().first()
    if dup_batch:
        raise ValueError("Este arquivo já foi importado anteriormente. Importação duplicada bloqueada.")

    staged = json.loads(batch.staged_records_json or "[]")
    if not staged:
        raise ValueError("Não há registros válidos para importar neste lote.")

    existing_hashes = set(db.execute(select(SaleRecord.row_hash)).scalars().all())
    records_to_insert: List[SaleRecord] = []

    for item in staged:
        if item["row_hash"] in existing_hashes:
            continue
        existing_hashes.add(item["row_hash"])
        records_to_insert.append(
            SaleRecord(
                batch_id=batch.id,
                sale_date=date.fromisoformat(item["sale_date"]),
                order_id=item["order_id"],
                product=item["product"],
                category=item["category"],
                quantity=float(item["quantity"]),
                unit_price=float(item["unit_price"]),
                discount=float(item["discount"]),
                unit_cost=float(item["unit_cost"]) if item["unit_cost"] is not None else None,
                salesperson=item["salesperson"],
                region=item["region"],
                payment_method=item["payment_method"],
                is_demo=False,
                row_hash=item["row_hash"],
            )
        )

    db.add_all(records_to_insert)
    batch.status = "confirmed"
    batch.valid_rows = len(records_to_insert)
    batch.staged_records_json = None
    db.commit()

    return {
        "batch_id": batch.id,
        "status": "confirmed",
        "imported_records": len(records_to_insert),
        "filename": batch.filename,
    }


def cancel_import_batch(db: Session, batch_id: int) -> Dict[str, Any]:
    """Cancels a staged import batch and cleans up temporary staging data."""
    batch = db.get(ImportBatch, batch_id)
    if not batch:
        raise ValueError("Lote de importação não encontrado.")
    if batch.status == "confirmed":
        raise ValueError("Não é possível cancelar um lote já confirmado.")

    batch.status = "cancelled"
    batch.staged_records_json = None
    db.commit()
    return {"batch_id": batch.id, "status": "cancelled"}
