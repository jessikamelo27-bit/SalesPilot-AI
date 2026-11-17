import io
import pandas as pd


def test_csv_import_and_duplicate_file_prevention(client):
    """Tests uploading a valid CSV file, confirming it, and preventing duplicate re-import."""
    csv_data = (
        "Data da venda,Numero do pedido,Produto,Categoria,Quantidade vendida,Preco unitario,Desconto,Custo do produto,Vendedor,Regiao,Forma de pagamento\n"
        "2026-10-01,ORD-501,Notebook Pro,Hardware,2,4500.00,100.00,3000.00,Mariana Costa,Sudeste,PIX\n"
        "2026-10-02,ORD-502,Mouse Sem Fio,Acessorios,5,150.00,0.00,70.00,Rafael Mendes,Sul,Cartao\n"
    )

    resp = client.post(
        "/api/imports/upload",
        files={"file": ("vendas_outubro.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert resp.status_code == 200
    preview = resp.json()
    assert preview["records_to_import"] == 2
    assert preview["can_import"] is True
    assert preview["is_duplicate_file"] is False
    assert preview["quality"]["invalid_rows_count"] == 0

    batch_id = preview["batch_id"]
    confirm_resp = client.post(f"/api/imports/{batch_id}/confirm")
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["imported_records"] == 2

    # Attempting to upload the exact same file again must detect duplicate file and duplicate records
    dup_resp = client.post(
        "/api/imports/upload",
        files={"file": ("vendas_outubro.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert dup_resp.status_code == 200
    dup_preview = dup_resp.json()
    assert dup_preview["is_duplicate_file"] is True
    assert dup_preview["can_import"] is False
    assert dup_preview["quality"]["already_imported_rows_count"] == 2


def test_xlsx_import_workflow(client):
    """Tests uploading and confirming an XLSX spreadsheet."""
    df = pd.DataFrame(
        [
            {
                "Data da venda": "2026-09-15",
                "Numero do pedido": "XLSX-1001",
                "Produto": "Licenca Cloud",
                "Categoria": "Software",
                "Quantidade vendida": 4,
                "Preco unitario": 1200.0,
                "Desconto": 50.0,
                "Custo do produto": 300.0,
                "Vendedor": "Camila Albuquerque",
                "Regiao": "Nordeste",
                "Forma de pagamento": "Boleto",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False)
    buf.seek(0)

    resp = client.post(
        "/api/imports/upload",
        files={
            "file": (
                "planilha_vendas.xlsx",
                buf.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["records_to_import"] == 1
    assert data["can_import"] is True

    confirm_resp = client.post(f"/api/imports/{data['batch_id']}/confirm")
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["imported_records"] == 1


def test_data_quality_inconsistencies_and_in_file_duplicates_detected(client):
    """
    Verifies that every required data quality inconsistency is explicitly reported:
    - Venda sem data
    - Quantidade negativa
    - Preço unitário inválido
    - Produto sem identificação
    - Pedido duplicado
    - Desconto superior ao valor permitido
    - Registro sem vendedor
    """
    csv_with_issues = (
        "Data da venda,Numero do pedido,Produto,Categoria,Quantidade vendida,Preco unitario,Desconto,Custo do produto,Vendedor,Regiao,Forma de pagamento\n"
        "2026-10-01,PED-OK,Monitor 4K,Hardware,2,2000.00,100.00,1200.00,Mariana,Sudeste,PIX\n"
        "2026-10-01,PED-OK,Monitor 4K,Hardware,2,2000.00,100.00,1200.00,Mariana,Sudeste,PIX\n"  # Duplicate order!
        ",PED-ERR1,Monitor 4K,Hardware,1,2000.00,0.00,1200.00,Mariana,Sudeste,PIX\n"            # Venda sem data
        "2026-10-03,PED-ERR2,Monitor 4K,Hardware,-3,2000.00,0.00,1200.00,Mariana,Sudeste,PIX\n"  # Quantidade negativa
        "2026-10-04,PED-ERR3,Monitor 4K,Hardware,1,0.00,0.00,1200.00,Mariana,Sudeste,PIX\n"      # Preco invalido
        "2026-10-05,PED-ERR4,,Hardware,1,2000.00,0.00,1200.00,Mariana,Sudeste,PIX\n"             # Produto sem identificacao
        "2026-10-06,PED-ERR5,Monitor 4K,Hardware,1,2000.00,1500.00,1200.00,Mariana,Sudeste,PIX\n"  # Desconto superior ao permitido (>50%)
        "2026-10-07,PED-ERR6,Monitor 4K,Hardware,1,2000.00,0.00,1200.00,,Sudeste,PIX\n"          # Registro sem vendedor
    )

    resp = client.post(
        "/api/imports/upload",
        files={"file": ("auditoria_qualidade.csv", csv_with_issues.encode("utf-8"), "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    q = body["quality"]

    assert q["total_rows_read"] == 8
    assert q["valid_rows_count"] == 1
    assert q["duplicate_rows_count"] == 1
    assert q["invalid_rows_count"] == 6

    issue_types = q["issue_counts_by_type"]
    assert "pedido_duplicado" in issue_types
    assert "venda_sem_data_ou_invalida" in issue_types
    assert "quantidade_negativa_ou_zero" in issue_types
    assert "preco_unitario_invalido" in issue_types
    assert "produto_sem_identificacao" in issue_types
    assert "desconto_superior_ao_permitido" in issue_types
    assert "registro_sem_vendedor" in issue_types
