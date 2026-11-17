import random
from datetime import date, timedelta
from typing import Dict, Any, List
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from app.models import ImportBatch, SaleRecord
from app.services.importer import compute_row_hash


def load_demo_data(db: Session) -> Dict[str, Any]:
    """
    Generates a deterministic, realistic 12-month synthetic commercial dataset with intentional
    business scenarios:
    1. A product with sharp sales decline ('Terminal POS Smart X2').
    2. A rapidly growing category ('Cloud & Infraestrutura').
    3. A salesperson performing significantly above average ('Mariana Costa') and one below ('Bruno Silveira').
    4. A product with low profit margin ('Servidor Edge Rack 2U', margin ~9.5%).
    5. A specific month with a significant revenue dip (2026-07).
    6. High revenue concentration in top products.
    Strictly preserves real user records (is_demo=False).
    """
    # Clear existing demo data first to avoid duplicating demo rows
    clear_demo_data(db)

    rng = random.Random(42)

    batch = ImportBatch(
        filename="DEMO_SYNTHETIC_DATASET_12M.csv",
        file_hash="synthetic_demo_dataset_v1_hash",
        total_rows=0,
        valid_rows=0,
        invalid_rows=0,
        duplicate_rows=0,
        has_cost_column=True,
        is_demo=True,
        status="confirmed",
    )
    db.add(batch)
    db.flush()

    products_catalog = [
        {
            "product": "Enterprise Cloud Suite Pro",
            "category": "Cloud & Infraestrutura",
            "unit_price": 3200.00,
            "unit_cost": 1120.00,  # ~65% gross margin
            "early_weight": 18,
            "late_weight": 34,  # Strong growth + high concentration
        },
        {
            "product": "DataLake Analytics Node",
            "category": "Cloud & Infraestrutura",
            "unit_price": 2400.00,
            "unit_cost": 960.00,  # ~60% margin
            "early_weight": 10,
            "late_weight": 22,  # Strong growth in Cloud & Infraestrutura
        },
        {
            "product": "Terminal POS Smart X2",
            "category": "Hardware Corporativo",
            "unit_price": 1450.00,
            "unit_cost": 870.00,  # ~40% margin
            "early_weight": 26,
            "late_weight": 9,  # Intentional sharp drop in sales (-65% in second half!)
        },
        {
            "product": "Servidor Edge Rack 2U",
            "category": "Hardware Corporativo",
            "unit_price": 4800.00,
            "unit_cost": 4220.00,  # Intentional low margin (~9-11% after discounts!)
            "early_weight": 11,
            "late_weight": 12,
        },
        {
            "product": "Estação de Trabalho Pro Max",
            "category": "Hardware Corporativo",
            "unit_price": 2900.00,
            "unit_cost": 2030.00,
            "early_weight": 9,
            "late_weight": 9,
        },
        {
            "product": "ShieldZero Endpoint Security",
            "category": "Licenças & Cibersegurança",
            "unit_price": 1850.00,
            "unit_cost": 555.00,
            "early_weight": 14,
            "late_weight": 17,
        },
        {
            "product": "API Gateway Enterprise",
            "category": "Licenças & Cibersegurança",
            "unit_price": 2100.00,
            "unit_cost": 690.00,
            "early_weight": 8,
            "late_weight": 10,
        },
        {
            "product": "Implantação BI & Data Ops",
            "category": "Serviços & Consultoria",
            "unit_price": 3600.00,
            "unit_cost": 1980.00,
            "early_weight": 7,
            "late_weight": 9,
        },
    ]

    salespeople = [
        {"name": "Mariana Costa", "region": "Sudeste", "weight": 34},       # Above average star performer
        {"name": "Rafael Mendes", "region": "Sul", "weight": 22},
        {"name": "Camila Albuquerque", "region": "Nordeste", "weight": 19},
        {"name": "Lucas Ferreira", "region": "Centro-Oeste", "weight": 16},
        {"name": "Bruno Silveira", "region": "Norte", "weight": 9},         # Below average performer
    ]

    payment_methods = ["PIX Corporativo", "Boleto Faturado 30d", "Cartão Corporativo", "Transferência TED"]

    # 12 full months: Nov 2025 to Oct 2026
    months = [
        (2025, 11, 58, False),
        (2025, 12, 68, False),
        (2026, 1, 55, False),
        (2026, 2, 60, False),
        (2026, 3, 64, False),
        (2026, 4, 62, False),
        (2026, 5, 70, True),
        (2026, 6, 74, True),
        (2026, 7, 36, True),   # Intentional sharp period drop in July 2026!
        (2026, 8, 76, True),
        (2026, 9, 82, True),
        (2026, 10, 88, True),
    ]

    records: List[SaleRecord] = []
    order_seq = 10000

    sp_names = [s["name"] for s in salespeople]
    sp_regions = {s["name"]: s["region"] for s in salespeople}
    sp_weights = [s["weight"] for s in salespeople]

    for year, month, num_orders, is_second_half in months:
        p_weights = [p["late_weight"] if is_second_half else p["early_weight"] for p in products_catalog]

        for _ in range(num_orders):
            order_seq += 1
            order_id = f"DEMO-{year}{month:02d}-{order_seq}"
            day = rng.randint(1, 28)
            sale_dt = date(year, month, day)

            sp_name = rng.choices(sp_names, weights=sp_weights, k=1)[0]
            region = sp_regions[sp_name]
            payment = rng.choice(payment_methods)

            # 1 or 2 items per order
            items_in_order = 2 if rng.random() < 0.22 else 1
            chosen_products = rng.choices(products_catalog, weights=p_weights, k=items_in_order)

            seen_prods = set()
            for prod_info in chosen_products:
                pname = prod_info["product"]
                if pname in seen_prods:
                    continue
                seen_prods.add(pname)

                # Mariana Costa tends to close larger quantities
                if sp_name == "Mariana Costa":
                    qty = float(rng.choice([2, 3, 4, 5]))
                elif sp_name == "Bruno Silveira":
                    qty = float(rng.choice([1, 1, 2]))
                else:
                    qty = float(rng.choice([1, 2, 3, 4]))

                # Terminal POS Smart X2 has smaller quantities in the second half to accentuate the drop
                if pname == "Terminal POS Smart X2" and is_second_half:
                    qty = 1.0
                elif pname == "Terminal POS Smart X2" and not is_second_half:
                    qty = float(rng.choice([3, 4, 5]))

                u_price = prod_info["unit_price"]
                u_cost = prod_info["unit_cost"]
                gross = qty * u_price

                # Apply realistic discount (0% to 8%, slightly higher on Servidor Edge Rack 2U)
                if pname == "Servidor Edge Rack 2U":
                    disc_pct = rng.choice([0.02, 0.03, 0.04])
                else:
                    disc_pct = rng.choice([0.0, 0.0, 0.03, 0.05, 0.08])
                discount = round(gross * disc_pct, 2)

                r_hash = compute_row_hash(order_id, pname, sale_dt.isoformat(), qty, u_price)
                records.append(
                    SaleRecord(
                        batch_id=batch.id,
                        sale_date=sale_dt,
                        order_id=order_id,
                        product=pname,
                        category=prod_info["category"],
                        quantity=qty,
                        unit_price=u_price,
                        discount=discount,
                        unit_cost=u_cost,
                        salesperson=sp_name,
                        region=region,
                        payment_method=payment,
                        is_demo=True,
                        row_hash=r_hash,
                    )
                )

    batch.total_rows = len(records)
    batch.valid_rows = len(records)
    db.add_all(records)
    db.commit()

    return {
        "status": "loaded",
        "demo_records_loaded": len(records),
        "months_covered": 12,
        "period": "2025-11-01 a 2026-10-28",
        "is_synthetic_demo": True,
    }


def clear_demo_data(db: Session) -> Dict[str, Any]:
    """
    Removes only synthetic demonstration records (is_demo=True) and demo batches,
    strictly preserving all real user records (is_demo=False).
    """
    deleted_records = db.execute(delete(SaleRecord).where(SaleRecord.is_demo.is_(True))).rowcount
    db.execute(delete(ImportBatch).where(ImportBatch.is_demo.is_(True)))
    db.commit()

    remaining_real = db.execute(
        select(SaleRecord.id).where(SaleRecord.is_demo.is_(False))
    ).scalars().all()

    return {
        "status": "cleared",
        "deleted_demo_records": int(deleted_records or 0),
        "remaining_real_records": len(remaining_real),
    }
