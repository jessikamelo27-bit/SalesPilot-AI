from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import SaleRecord
from app.schemas import (
    CategoryBreakdownItem,
    DashboardResponse,
    FilterOptionsResponse,
    FilterParams,
    KPIMetrics,
    ProductPerformanceItem,
    RegionBreakdownItem,
    RevenueEvolutionPoint,
    SalespersonPerformanceItem,
)


def fetch_records_df(db: Session, filters: Optional[FilterParams] = None, apply_date_filter: bool = True) -> pd.DataFrame:
    """
    Fetch validated sales records using parameterized SQLAlchemy queries and return a structured DataFrame.
    """
    stmt = select(SaleRecord)

    if filters:
        if not filters.include_demo:
            stmt = stmt.where(SaleRecord.is_demo.is_(False))
        if apply_date_filter and filters.start_date:
            stmt = stmt.where(SaleRecord.sale_date >= filters.start_date)
        if apply_date_filter and filters.end_date:
            stmt = stmt.where(SaleRecord.sale_date <= filters.end_date)
        if filters.category and filters.category != "all":
            stmt = stmt.where(SaleRecord.category == filters.category)
        if filters.product and filters.product != "all":
            stmt = stmt.where(SaleRecord.product == filters.product)
        if filters.salesperson and filters.salesperson != "all":
            stmt = stmt.where(SaleRecord.salesperson == filters.salesperson)
        if filters.region and filters.region != "all":
            stmt = stmt.where(SaleRecord.region == filters.region)

    records = db.execute(stmt).scalars().all()
    if not records:
        return pd.DataFrame(
            columns=[
                "id",
                "sale_date",
                "order_id",
                "product",
                "category",
                "quantity",
                "unit_price",
                "discount",
                "unit_cost",
                "salesperson",
                "region",
                "payment_method",
                "is_demo",
                "gross_revenue",
                "net_revenue",
                "total_cost",
                "gross_profit",
            ]
        )

    rows = [
        {
            "id": r.id,
            "sale_date": pd.to_datetime(r.sale_date),
            "order_id": str(r.order_id),
            "product": r.product,
            "category": r.category,
            "quantity": float(r.quantity),
            "unit_price": float(r.unit_price),
            "discount": float(r.discount or 0.0),
            "unit_cost": float(r.unit_cost) if r.unit_cost is not None else np.nan,
            "salesperson": r.salesperson,
            "region": r.region,
            "payment_method": r.payment_method,
            "is_demo": bool(r.is_demo),
        }
        for r in records
    ]
    df = pd.DataFrame(rows)
    return enrich_financial_columns(df)


def enrich_financial_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies exact deterministic financial formulas to a sales DataFrame:
    - Gross Revenue = quantity * unit_price
    - Net Revenue = Gross Revenue - discount
    - Total Cost = quantity * unit_cost (NaN when unit_cost is missing)
    - Gross Profit = Net Revenue - Total Cost (NaN when unit_cost is missing)
    """
    if df.empty:
        return df
    df = df.copy()
    df["sale_date"] = pd.to_datetime(df["sale_date"])
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0.0)
    df["unit_price"] = pd.to_numeric(df["unit_price"], errors="coerce").fillna(0.0)
    df["discount"] = pd.to_numeric(df["discount"], errors="coerce").fillna(0.0)
    if "unit_cost" in df.columns:
        df["unit_cost"] = pd.to_numeric(df["unit_cost"], errors="coerce")
    else:
        df["unit_cost"] = np.nan

    df["gross_revenue"] = df["quantity"] * df["unit_price"]
    df["net_revenue"] = df["gross_revenue"] - df["discount"]
    df["total_cost"] = np.where(df["unit_cost"].notna(), df["quantity"] * df["unit_cost"], np.nan)
    df["gross_profit"] = np.where(df["unit_cost"].notna(), df["net_revenue"] - df["total_cost"], np.nan)
    return df


def safe_growth_pct(current_val: Optional[float], previous_val: Optional[float]) -> Optional[float]:
    """Calculates percentage change: ((current - previous) / |previous|) * 100, handling zero or None safely."""
    if current_val is None or previous_val is None:
        return None
    if np.isnan(current_val) or np.isnan(previous_val):
        return None
    if abs(previous_val) < 1e-9:
        return None
    return round(((current_val - previous_val) / abs(previous_val)) * 100.0, 2)


def split_current_and_previous_df(
    full_df: pd.DataFrame,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> Tuple[pd.DataFrame, pd.DataFrame, str, str]:
    """
    Determines the current period DataFrame and the equivalent preceding period DataFrame.
    - If start_date and end_date are explicitly passed, the previous period has the exact same duration
      immediately preceding start_date.
    - If no dates are passed, compares the second half of the dataset timeline against the first half,
      or latest month vs prior month if <= 62 days.
    """
    if full_df.empty:
        return full_df, full_df, "Sem período", "Sem período anterior"

    min_ts = full_df["sale_date"].min()
    max_ts = full_df["sale_date"].max()

    if start_date and end_date:
        cur_start = pd.Timestamp(start_date)
        cur_end = pd.Timestamp(end_date)
        span_days = max((cur_end - cur_start).days + 1, 1)
        prev_end = cur_start - pd.Timedelta(days=1)
        prev_start = prev_end - pd.Timedelta(days=span_days - 1)
    elif start_date and not end_date:
        cur_start = pd.Timestamp(start_date)
        cur_end = max_ts
        span_days = max((cur_end - cur_start).days + 1, 1)
        prev_end = cur_start - pd.Timedelta(days=1)
        prev_start = prev_end - pd.Timedelta(days=span_days - 1)
    elif end_date and not start_date:
        cur_end = pd.Timestamp(end_date)
        cur_start = min_ts
        span_days = max((cur_end - cur_start).days + 1, 1)
        prev_end = cur_start - pd.Timedelta(days=1)
        prev_start = prev_end - pd.Timedelta(days=span_days - 1)
    else:
        # When viewing the full dataset without explicit date filters:
        # Compare the most recent half of the timeline (e.g., last 6 months) vs the preceding half (first 6 months)
        # while still returning all data in current_df for global totals if desired — Wait!
        # Let's check: For global totals without date filter, KPIs should reflect the selected period (all data),
        # and for growth comparison when no filter is set, comparing the latest half of the period vs the first half
        # (or latest month vs previous month) gives a clear, verifiable period comparison!
        # Even better: when no date filter is set, let's compute growth comparing the second half of the date range
        # vs the first half of the date range, and explicitly label the periods in `period_label` and `previous_period_label`!
        total_days = max((max_ts - min_ts).days + 1, 1)
        if total_days >= 14:
            half_days = total_days // 2
            mid_point = max_ts - pd.Timedelta(days=half_days - 1)
            prev_end = mid_point - pd.Timedelta(days=1)
            prev_start = prev_end - pd.Timedelta(days=half_days - 1)
            cur_df = full_df
            comp_cur_df = full_df[(full_df["sale_date"] >= mid_point) & (full_df["sale_date"] <= max_ts)]
            comp_prev_df = full_df[(full_df["sale_date"] >= prev_start) & (full_df["sale_date"] <= prev_end)]
            p_label = f"{mid_point.strftime('%d/%m/%Y')} a {max_ts.strftime('%d/%m/%Y')}"
            prev_label = f"{prev_start.strftime('%d/%m/%Y')} a {prev_end.strftime('%d/%m/%Y')}"
            return cur_df, comp_prev_df, p_label, prev_label
        else:
            return full_df, pd.DataFrame(columns=full_df.columns), f"{min_ts.strftime('%d/%m/%Y')} a {max_ts.strftime('%d/%m/%Y')}", "Sem período anterior"

    cur_df = full_df[(full_df["sale_date"] >= cur_start) & (full_df["sale_date"] <= cur_end)]
    prev_df = full_df[(full_df["sale_date"] >= prev_start) & (full_df["sale_date"] <= prev_end)]
    p_label = f"{cur_start.strftime('%d/%m/%Y')} a {cur_end.strftime('%d/%m/%Y')}"
    prev_label = f"{prev_start.strftime('%d/%m/%Y')} a {prev_end.strftime('%d/%m/%Y')}"
    return cur_df, prev_df, p_label, prev_label


def calculate_kpi_metrics(
    current_df: pd.DataFrame,
    previous_df: Optional[pd.DataFrame] = None,
    period_label: str = "",
    previous_period_label: str = "",
    comparison_current_df: Optional[pd.DataFrame] = None,
) -> KPIMetrics:
    """
    Calculates exact commercial indicators from a validated sales DataFrame.
    Never invents cost/profit/margin when unit_cost is missing.
    Never confuses item quantity with unique order count.
    """
    if current_df.empty:
        return KPIMetrics(
            gross_revenue=0.0,
            total_discounts=0.0,
            net_revenue=0.0,
            total_orders=0,
            total_items_sold=0.0,
            average_ticket=0.0,
            total_cost=None,
            gross_profit=None,
            profit_margin_pct=None,
            has_cost_data=False,
            cost_coverage_pct=0.0,
            period_label=period_label,
            previous_period_label=previous_period_label,
        )

    df = enrich_financial_columns(current_df)
    gross_revenue = round(float(df["gross_revenue"].sum()), 2)
    total_discounts = round(float(df["discount"].sum()), 2)
    net_revenue = round(float(df["net_revenue"].sum()), 2)
    total_orders = int(df["order_id"].nunique())
    total_items_sold = round(float(df["quantity"].sum()), 2)
    average_ticket = round(net_revenue / total_orders, 2) if total_orders > 0 else 0.0

    # Check if unit_cost is available
    cost_valid_mask = df["unit_cost"].notna()
    cost_coverage_pct = round(float(cost_valid_mask.mean() * 100.0), 1)
    has_cost_data = bool(cost_valid_mask.all() and len(df) > 0)

    if has_cost_data:
        total_cost = round(float(df["total_cost"].sum()), 2)
        gross_profit = round(net_revenue - total_cost, 2)
        profit_margin_pct = round((gross_profit / net_revenue) * 100.0, 2) if abs(net_revenue) > 1e-9 else 0.0
    else:
        total_cost = None
        gross_profit = None
        profit_margin_pct = None

    prev_net_rev = None
    rev_growth = None
    prev_orders = None
    orders_growth = None
    prev_ticket = None
    ticket_growth = None
    prev_profit = None
    profit_growth = None

    comp_cur = enrich_financial_columns(comparison_current_df) if comparison_current_df is not None else df

    if previous_df is not None and not previous_df.empty and not comp_cur.empty:
        p_df = enrich_financial_columns(previous_df)
        cur_comp_rev = round(float(comp_cur["net_revenue"].sum()), 2)
        prev_net_rev = round(float(p_df["net_revenue"].sum()), 2)
        rev_growth = safe_growth_pct(cur_comp_rev, prev_net_rev)

        cur_comp_orders = int(comp_cur["order_id"].nunique())
        prev_orders = int(p_df["order_id"].nunique())
        orders_growth = safe_growth_pct(float(cur_comp_orders), float(prev_orders))

        cur_comp_ticket = round(cur_comp_rev / cur_comp_orders, 2) if cur_comp_orders > 0 else 0.0
        prev_ticket = round(prev_net_rev / prev_orders, 2) if prev_orders > 0 else 0.0
        ticket_growth = safe_growth_pct(cur_comp_ticket, prev_ticket)

        if has_cost_data and p_df["unit_cost"].notna().all():
            cur_comp_profit = round(float(comp_cur["gross_profit"].sum()), 2)
            prev_profit = round(float(p_df["gross_profit"].sum()), 2)
            profit_growth = safe_growth_pct(cur_comp_profit, prev_profit)

    return KPIMetrics(
        gross_revenue=gross_revenue,
        total_discounts=total_discounts,
        net_revenue=net_revenue,
        total_orders=total_orders,
        total_items_sold=total_items_sold,
        average_ticket=average_ticket,
        total_cost=total_cost,
        gross_profit=gross_profit,
        profit_margin_pct=profit_margin_pct,
        has_cost_data=has_cost_data,
        cost_coverage_pct=cost_coverage_pct,
        previous_net_revenue=prev_net_rev,
        revenue_growth_pct=rev_growth,
        previous_orders=prev_orders,
        orders_growth_pct=orders_growth,
        previous_average_ticket=prev_ticket,
        ticket_growth_pct=ticket_growth,
        previous_gross_profit=prev_profit,
        profit_growth_pct=profit_growth,
        period_label=period_label,
        previous_period_label=previous_period_label,
    )


def build_revenue_evolution(current_df: pd.DataFrame) -> List[RevenueEvolutionPoint]:
    """Builds monthly (or daily if range <= 45 days) revenue evolution series with period-over-period comparison."""
    if current_df.empty:
        return []

    df = enrich_financial_columns(current_df)
    span_days = (df["sale_date"].max() - df["sale_date"].min()).days + 1
    has_cost = bool(df["unit_cost"].notna().all())

    if span_days <= 45:
        df["period_key"] = df["sale_date"].dt.strftime("%Y-%m-%d")
    else:
        df["period_key"] = df["sale_date"].dt.strftime("%Y-%m")

    grouped = (
        df.groupby("period_key", as_index=False)
        .agg(
            gross_revenue=("gross_revenue", "sum"),
            net_revenue=("net_revenue", "sum"),
            gross_profit=("gross_profit", "sum"),
            orders=("order_id", "nunique"),
            items_sold=("quantity", "sum"),
        )
        .sort_values("period_key")
    )

    points: List[RevenueEvolutionPoint] = []
    prev_val: Optional[float] = None
    for _, row in grouped.iterrows():
        net_rev = round(float(row["net_revenue"]), 2)
        points.append(
            RevenueEvolutionPoint(
                period=str(row["period_key"]),
                gross_revenue=round(float(row["gross_revenue"]), 2),
                net_revenue=net_rev,
                gross_profit=round(float(row["gross_profit"]), 2) if has_cost else None,
                orders=int(row["orders"]),
                items_sold=round(float(row["items_sold"]), 2),
                previous_net_revenue=prev_val,
            )
        )
        prev_val = net_rev
    return points


def build_category_breakdown(
    current_df: pd.DataFrame,
    comp_current_df: Optional[pd.DataFrame] = None,
    previous_df: Optional[pd.DataFrame] = None,
) -> List[CategoryBreakdownItem]:
    if current_df.empty:
        return []

    df = enrich_financial_columns(current_df)
    total_net = float(df["net_revenue"].sum())
    has_cost = bool(df["unit_cost"].notna().all())

    prev_map: Dict[str, float] = {}
    cur_comp_map: Dict[str, float] = {}
    if previous_df is not None and not previous_df.empty:
        p_df = enrich_financial_columns(previous_df)
        prev_map = p_df.groupby("category")["net_revenue"].sum().to_dict()
        c_df = enrich_financial_columns(comp_current_df) if comp_current_df is not None else df
        cur_comp_map = c_df.groupby("category")["net_revenue"].sum().to_dict()

    grouped = (
        df.groupby("category", as_index=False)
        .agg(
            net_revenue=("net_revenue", "sum"),
            gross_revenue=("gross_revenue", "sum"),
            items_sold=("quantity", "sum"),
            orders=("order_id", "nunique"),
            gross_profit=("gross_profit", "sum"),
        )
        .sort_values("net_revenue", ascending=False)
    )

    items: List[CategoryBreakdownItem] = []
    for _, row in grouped.iterrows():
        cat = str(row["category"])
        net_rev = round(float(row["net_revenue"]), 2)
        profit = round(float(row["gross_profit"]), 2) if has_cost else None
        margin = round((profit / net_rev) * 100.0, 2) if (has_cost and profit is not None and abs(net_rev) > 1e-9) else None
        share = round((net_rev / total_net) * 100.0, 2) if abs(total_net) > 1e-9 else 0.0
        growth = safe_growth_pct(cur_comp_map.get(cat), prev_map.get(cat)) if prev_map else None

        items.append(
            CategoryBreakdownItem(
                category=cat,
                net_revenue=net_rev,
                gross_revenue=round(float(row["gross_revenue"]), 2),
                items_sold=round(float(row["items_sold"]), 2),
                orders=int(row["orders"]),
                share_pct=share,
                gross_profit=profit,
                margin_pct=margin,
                growth_pct=growth,
            )
        )
    return items


def build_product_performance(
    current_df: pd.DataFrame,
    comp_current_df: Optional[pd.DataFrame] = None,
    previous_df: Optional[pd.DataFrame] = None,
) -> List[ProductPerformanceItem]:
    if current_df.empty:
        return []

    df = enrich_financial_columns(current_df)
    total_net = float(df["net_revenue"].sum())
    has_cost = bool(df["unit_cost"].notna().all())

    prev_map: Dict[str, float] = {}
    cur_comp_map: Dict[str, float] = {}
    if previous_df is not None and not previous_df.empty:
        p_df = enrich_financial_columns(previous_df)
        prev_map = p_df.groupby("product")["net_revenue"].sum().to_dict()
        c_df = enrich_financial_columns(comp_current_df) if comp_current_df is not None else df
        cur_comp_map = c_df.groupby("product")["net_revenue"].sum().to_dict()

    grouped = (
        df.groupby(["product", "category"], as_index=False)
        .agg(
            net_revenue=("net_revenue", "sum"),
            gross_revenue=("gross_revenue", "sum"),
            discounts=("discount", "sum"),
            items_sold=("quantity", "sum"),
            orders=("order_id", "nunique"),
            avg_unit_price=("unit_price", "mean"),
            total_cost=("total_cost", "sum"),
            gross_profit=("gross_profit", "sum"),
        )
        .sort_values("net_revenue", ascending=False)
    )

    items: List[ProductPerformanceItem] = []
    for _, row in grouped.iterrows():
        prod = str(row["product"])
        net_rev = round(float(row["net_revenue"]), 2)
        t_cost = round(float(row["total_cost"]), 2) if has_cost else None
        profit = round(float(row["gross_profit"]), 2) if has_cost else None
        margin = round((profit / net_rev) * 100.0, 2) if (has_cost and profit is not None and abs(net_rev) > 1e-9) else None
        share = round((net_rev / total_net) * 100.0, 2) if abs(total_net) > 1e-9 else 0.0
        prev_rev = round(float(prev_map[prod]), 2) if prod in prev_map else None
        growth = safe_growth_pct(cur_comp_map.get(prod, 0.0), prev_rev) if prev_rev is not None else None

        status = "estavel"
        if margin is not None and margin < 18.0:
            status = "atencao_margem"
        elif growth is not None and growth <= -10.0:
            status = "queda"
        elif growth is not None and growth >= 12.0:
            status = "crescimento"

        items.append(
            ProductPerformanceItem(
                product=prod,
                category=str(row["category"]),
                net_revenue=net_rev,
                gross_revenue=round(float(row["gross_revenue"]), 2),
                discounts=round(float(row["discounts"]), 2),
                items_sold=round(float(row["items_sold"]), 2),
                orders=int(row["orders"]),
                avg_unit_price=round(float(row["avg_unit_price"]), 2),
                total_cost=t_cost,
                gross_profit=profit,
                margin_pct=margin,
                share_pct=share,
                growth_pct=growth,
                previous_net_revenue=prev_rev,
                status=status,
            )
        )
    return items


def build_salesperson_performance(
    current_df: pd.DataFrame,
    comp_current_df: Optional[pd.DataFrame] = None,
    previous_df: Optional[pd.DataFrame] = None,
) -> List[SalespersonPerformanceItem]:
    if current_df.empty:
        return []

    df = enrich_financial_columns(current_df)
    total_net = float(df["net_revenue"].sum())
    has_cost = bool(df["unit_cost"].notna().all())

    prev_map: Dict[str, float] = {}
    cur_comp_map: Dict[str, float] = {}
    if previous_df is not None and not previous_df.empty:
        p_df = enrich_financial_columns(previous_df)
        prev_map = p_df.groupby("salesperson")["net_revenue"].sum().to_dict()
        c_df = enrich_financial_columns(comp_current_df) if comp_current_df is not None else df
        cur_comp_map = c_df.groupby("salesperson")["net_revenue"].sum().to_dict()

    grouped = (
        df.groupby("salesperson", as_index=False)
        .agg(
            region=("region", lambda s: s.mode().iloc[0] if not s.mode().empty else s.iloc[0]),
            net_revenue=("net_revenue", "sum"),
            gross_revenue=("gross_revenue", "sum"),
            discounts=("discount", "sum"),
            orders=("order_id", "nunique"),
            items_sold=("quantity", "sum"),
            gross_profit=("gross_profit", "sum"),
        )
        .sort_values("net_revenue", ascending=False)
    )

    team_avg = float(grouped["net_revenue"].mean()) if not grouped.empty else 0.0

    # Determine top category per salesperson
    cat_by_sp = (
        df.groupby(["salesperson", "category"])["net_revenue"]
        .sum()
        .reset_index()
        .sort_values(["salesperson", "net_revenue"], ascending=[True, False])
        .drop_duplicates("salesperson")
        .set_index("salesperson")["category"]
        .to_dict()
    )

    items: List[SalespersonPerformanceItem] = []
    for _, row in grouped.iterrows():
        sp = str(row["salesperson"])
        net_rev = round(float(row["net_revenue"]), 2)
        orders = int(row["orders"])
        ticket = round(net_rev / orders, 2) if orders > 0 else 0.0
        profit = round(float(row["gross_profit"]), 2) if has_cost else None
        margin = round((profit / net_rev) * 100.0, 2) if (has_cost and profit is not None and abs(net_rev) > 1e-9) else None
        share = round((net_rev / total_net) * 100.0, 2) if abs(total_net) > 1e-9 else 0.0
        vs_avg = round(((net_rev - team_avg) / team_avg) * 100.0, 2) if abs(team_avg) > 1e-9 else 0.0
        growth = safe_growth_pct(cur_comp_map.get(sp, 0.0), prev_map.get(sp)) if sp in prev_map else None

        items.append(
            SalespersonPerformanceItem(
                salesperson=sp,
                region=str(row["region"]),
                net_revenue=net_rev,
                gross_revenue=round(float(row["gross_revenue"]), 2),
                discounts=round(float(row["discounts"]), 2),
                orders=orders,
                items_sold=round(float(row["items_sold"]), 2),
                average_ticket=ticket,
                gross_profit=profit,
                margin_pct=margin,
                share_pct=share,
                vs_team_avg_pct=vs_avg,
                growth_pct=growth,
                top_category=str(cat_by_sp.get(sp, "-")),
            )
        )
    return items


def build_region_breakdown(current_df: pd.DataFrame) -> List[RegionBreakdownItem]:
    if current_df.empty:
        return []

    df = enrich_financial_columns(current_df)
    total_net = float(df["net_revenue"].sum())
    has_cost = bool(df["unit_cost"].notna().all())

    grouped = (
        df.groupby("region", as_index=False)
        .agg(
            net_revenue=("net_revenue", "sum"),
            orders=("order_id", "nunique"),
            items_sold=("quantity", "sum"),
            gross_profit=("gross_profit", "sum"),
        )
        .sort_values("net_revenue", ascending=False)
    )

    items: List[RegionBreakdownItem] = []
    for _, row in grouped.iterrows():
        net_rev = round(float(row["net_revenue"]), 2)
        orders = int(row["orders"])
        ticket = round(net_rev / orders, 2) if orders > 0 else 0.0
        profit = round(float(row["gross_profit"]), 2) if has_cost else None
        margin = round((profit / net_rev) * 100.0, 2) if (has_cost and profit is not None and abs(net_rev) > 1e-9) else None
        share = round((net_rev / total_net) * 100.0, 2) if abs(total_net) > 1e-9 else 0.0

        items.append(
            RegionBreakdownItem(
                region=str(row["region"]),
                net_revenue=net_rev,
                orders=orders,
                items_sold=round(float(row["items_sold"]), 2),
                average_ticket=ticket,
                share_pct=share,
                gross_profit=profit,
                margin_pct=margin,
            )
        )
    return items


def get_dashboard_data(db: Session, filters: FilterParams) -> DashboardResponse:
    """Computes complete executive dashboard response from database records matching filters."""
    all_records_df = fetch_records_df(db, FilterParams(include_demo=True), apply_date_filter=False)
    real_count = int((~all_records_df["is_demo"]).sum()) if not all_records_df.empty else 0
    demo_count = int(all_records_df["is_demo"].sum()) if not all_records_df.empty else 0

    # Fetch records matching entity filters (category, product, salesperson, region) without date filter first
    # so we can compute the equivalent previous period accurately
    entity_filtered_df = fetch_records_df(db, filters, apply_date_filter=False)

    if entity_filtered_df.empty:
        empty_kpis = calculate_kpi_metrics(entity_filtered_df)
        return DashboardResponse(
            has_data=False,
            is_demo_active=demo_count > 0,
            real_records_count=real_count,
            demo_records_count=demo_count,
            kpis=empty_kpis,
            revenue_evolution=[],
            sales_by_category=[],
            top_products=[],
            salesperson_performance=[],
            sales_by_region=[],
        )

    cur_df, prev_df, p_label, prev_label = split_current_and_previous_df(
        entity_filtered_df,
        start_date=filters.start_date,
        end_date=filters.end_date,
    )

    # When no date filter is specified, cur_df has all rows in entity_filtered_df, while prev_df has the first half.
    # For growth comparison when no date filter is set, we compare the second half against the first half.
    comp_cur_df = cur_df
    if not filters.start_date and not filters.end_date and not entity_filtered_df.empty:
        min_ts = entity_filtered_df["sale_date"].min()
        max_ts = entity_filtered_df["sale_date"].max()
        total_days = max((max_ts - min_ts).days + 1, 1)
        if total_days >= 14:
            half_days = total_days // 2
            mid_point = max_ts - pd.Timedelta(days=half_days - 1)
            comp_cur_df = entity_filtered_df[
                (entity_filtered_df["sale_date"] >= mid_point) & (entity_filtered_df["sale_date"] <= max_ts)
            ]

    kpis = calculate_kpi_metrics(
        current_df=cur_df,
        previous_df=prev_df,
        period_label=p_label,
        previous_period_label=prev_label,
        comparison_current_df=comp_cur_df,
    )

    return DashboardResponse(
        has_data=not cur_df.empty,
        is_demo_active=demo_count > 0,
        real_records_count=real_count,
        demo_records_count=demo_count,
        kpis=kpis,
        revenue_evolution=build_revenue_evolution(cur_df),
        sales_by_category=build_category_breakdown(cur_df, comp_cur_df, prev_df),
        top_products=build_product_performance(cur_df, comp_cur_df, prev_df),
        salesperson_performance=build_salesperson_performance(cur_df, comp_cur_df, prev_df),
        sales_by_region=build_region_breakdown(cur_df),
    )


def get_filter_options(db: Session) -> FilterOptionsResponse:
    """Returns distinct filter values and dataset metadata."""
    df = fetch_records_df(db, FilterParams(include_demo=True), apply_date_filter=False)
    if df.empty:
        return FilterOptionsResponse(
            categories=[],
            products=[],
            salespeople=[],
            regions=[],
            min_date=None,
            max_date=None,
            total_records=0,
            demo_records=0,
            real_records=0,
            has_cost_data=False,
        )

    return FilterOptionsResponse(
        categories=sorted(df["category"].dropna().unique().tolist()),
        products=sorted(df["product"].dropna().unique().tolist()),
        salespeople=sorted(df["salesperson"].dropna().unique().tolist()),
        regions=sorted(df["region"].dropna().unique().tolist()),
        min_date=df["sale_date"].min().strftime("%Y-%m-%d"),
        max_date=df["sale_date"].max().strftime("%Y-%m-%d"),
        total_records=len(df),
        demo_records=int(df["is_demo"].sum()),
        real_records=int((~df["is_demo"]).sum()),
        has_cost_data=bool(df["unit_cost"].notna().all()),
    )
