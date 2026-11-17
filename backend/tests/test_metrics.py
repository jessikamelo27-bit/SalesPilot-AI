import numpy as np
import pandas as pd
import pytest
from app.services.metrics import calculate_kpi_metrics, safe_growth_pct
from app.services.reporter import sanitize_csv_cell


def test_financial_calculations_exact():
    """
    Verifies exact deterministic formulas:
    - Gross revenue = sum(quantity * unit_price)
    - Discounts = sum(discount)
    - Net revenue = gross_revenue - discounts
    - Total cost = sum(quantity * unit_cost)
    - Gross profit = net_revenue - total_cost
    - Profit margin = (gross_profit / net_revenue) * 100
    """
    df = pd.DataFrame(
        [
            {
                "sale_date": "2026-10-01",
                "order_id": "PED-100",
                "product": "Produto A",
                "category": "Cat 1",
                "quantity": 3.0,
                "unit_price": 1000.0,  # Gross = 3000
                "discount": 200.0,     # Net = 2800
                "unit_cost": 500.0,    # Cost = 1500, Profit = 1300
                "salesperson": "Ana",
                "region": "Sudeste",
                "payment_method": "PIX",
            },
            {
                "sale_date": "2026-10-02",
                "order_id": "PED-101",
                "product": "Produto B",
                "category": "Cat 2",
                "quantity": 2.0,
                "unit_price": 600.0,   # Gross = 1200
                "discount": 0.0,       # Net = 1200
                "unit_cost": 350.0,    # Cost = 700, Profit = 500
                "salesperson": "Carlos",
                "region": "Sul",
                "payment_method": "Boleto",
            },
        ]
    )

    kpis = calculate_kpi_metrics(df)
    assert kpis.gross_revenue == 4200.00
    assert kpis.total_discounts == 200.00
    assert kpis.net_revenue == 4000.00
    assert kpis.total_cost == 2200.00
    assert kpis.gross_profit == 1800.00
    assert kpis.profit_margin_pct == 45.00
    assert kpis.has_cost_data is True


def test_average_ticket_uses_unique_orders_not_items():
    """
    Ensures average ticket divides Net Revenue by unique orders (order_id),
    never confusing order count with item quantity or line count.
    """
    df = pd.DataFrame(
        [
            {
                "sale_date": "2026-10-01",
                "order_id": "PED-SAME-01",
                "product": "Item 1",
                "category": "Cat 1",
                "quantity": 5.0,
                "unit_price": 100.0,  # 500
                "discount": 0.0,
                "unit_cost": 50.0,
                "salesperson": "Ana",
                "region": "Sudeste",
                "payment_method": "PIX",
            },
            {
                "sale_date": "2026-10-01",
                "order_id": "PED-SAME-01",  # Same order with a second item!
                "product": "Item 2",
                "category": "Cat 1",
                "quantity": 5.0,
                "unit_price": 100.0,  # 500
                "discount": 0.0,
                "unit_cost": 50.0,
                "salesperson": "Ana",
                "region": "Sudeste",
                "payment_method": "PIX",
            },
            {
                "sale_date": "2026-10-02",
                "order_id": "PED-02",
                "product": "Item 1",
                "category": "Cat 1",
                "quantity": 2.0,
                "unit_price": 500.0,  # 1000
                "discount": 0.0,
                "unit_cost": 250.0,
                "salesperson": "Ana",
                "region": "Sudeste",
                "payment_method": "PIX",
            },
        ]
    )

    kpis = calculate_kpi_metrics(df)
    assert kpis.net_revenue == 2000.00
    assert kpis.total_items_sold == 12.00
    assert kpis.total_orders == 2  # Only 2 unique orders (PED-SAME-01 and PED-02)
    assert kpis.average_ticket == 1000.00  # 2000 / 2 unique orders = 1000.00


def test_missing_cost_does_not_invent_profit_or_margin():
    """
    When unit_cost is missing (NaN/None), the system must NOT invent profit or margin.
    """
    df = pd.DataFrame(
        [
            {
                "sale_date": "2026-10-01",
                "order_id": "PED-1",
                "product": "Prod Sem Custo",
                "category": "Cat",
                "quantity": 4.0,
                "unit_price": 250.0,
                "discount": 50.0,
                "unit_cost": np.nan,
                "salesperson": "Ana",
                "region": "Sul",
                "payment_method": "PIX",
            }
        ]
    )

    kpis = calculate_kpi_metrics(df)
    assert kpis.net_revenue == 950.00
    assert kpis.has_cost_data is False
    assert kpis.total_cost is None
    assert kpis.gross_profit is None
    assert kpis.profit_margin_pct is None


def test_percentage_growth_and_zero_division_safety():
    """Verifies percentage growth calculations and division-by-zero handling."""
    assert safe_growth_pct(150.0, 100.0) == 50.0
    assert safe_growth_pct(75.0, 100.0) == -25.0
    assert safe_growth_pct(100.0, 0.0) is None
    assert safe_growth_pct(100.0, None) is None

    cur_df = pd.DataFrame(
        [
            {
                "sale_date": "2026-10-10",
                "order_id": "P2",
                "product": "A",
                "category": "C",
                "quantity": 2.0,
                "unit_price": 600.0,
                "discount": 0.0,
                "unit_cost": 300.0,
                "salesperson": "S",
                "region": "R",
                "payment_method": "PIX",
            }
        ]
    )
    prev_df = pd.DataFrame(
        [
            {
                "sale_date": "2026-09-10",
                "order_id": "P1",
                "product": "A",
                "category": "C",
                "quantity": 2.0,
                "unit_price": 500.0,
                "discount": 0.0,
                "unit_cost": 250.0,
                "salesperson": "S",
                "region": "R",
                "payment_method": "PIX",
            }
        ]
    )
    kpis = calculate_kpi_metrics(cur_df, prev_df)
    assert kpis.net_revenue == 1200.0
    assert kpis.previous_net_revenue == 1000.0
    assert kpis.revenue_growth_pct == 20.0


def test_csv_formula_injection_sanitization():
    """Verifies dangerous formula prefixes are escaped in CSV exports."""
    assert sanitize_csv_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_csv_cell("+CMD|' /C calc'!A0") == "'+CMD|' /C calc'!A0"
    assert sanitize_csv_cell("-2+3") == "'-2+3"
    assert sanitize_csv_cell("@import") == "'@import"
    assert sanitize_csv_cell("Produto Normal") == "Produto Normal"
    assert sanitize_csv_cell(1250.50) == 1250.50
