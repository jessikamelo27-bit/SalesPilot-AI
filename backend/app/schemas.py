from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FilterParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category: Optional[str] = None
    product: Optional[str] = None
    salesperson: Optional[str] = None
    region: Optional[str] = None
    include_demo: bool = True


class FilterOptionsResponse(BaseModel):
    categories: List[str]
    products: List[str]
    salespeople: List[str]
    regions: List[str]
    min_date: Optional[str] = None
    max_date: Optional[str] = None
    total_records: int
    demo_records: int
    real_records: int
    has_cost_data: bool


class KPIMetrics(BaseModel):
    gross_revenue: float
    total_discounts: float
    net_revenue: float
    total_orders: int
    total_items_sold: float
    average_ticket: float
    total_cost: Optional[float] = None
    gross_profit: Optional[float] = None
    profit_margin_pct: Optional[float] = None
    has_cost_data: bool = True
    cost_coverage_pct: float = 100.0
    previous_net_revenue: Optional[float] = None
    revenue_growth_pct: Optional[float] = None
    previous_orders: Optional[int] = None
    orders_growth_pct: Optional[float] = None
    previous_average_ticket: Optional[float] = None
    ticket_growth_pct: Optional[float] = None
    previous_gross_profit: Optional[float] = None
    profit_growth_pct: Optional[float] = None
    period_label: str = ""
    previous_period_label: str = ""


class RevenueEvolutionPoint(BaseModel):
    period: str
    gross_revenue: float
    net_revenue: float
    gross_profit: Optional[float] = None
    orders: int
    items_sold: float
    previous_net_revenue: Optional[float] = None


class CategoryBreakdownItem(BaseModel):
    category: str
    net_revenue: float
    gross_revenue: float
    items_sold: float
    orders: int
    share_pct: float
    gross_profit: Optional[float] = None
    margin_pct: Optional[float] = None
    growth_pct: Optional[float] = None


class ProductPerformanceItem(BaseModel):
    product: str
    category: str
    net_revenue: float
    gross_revenue: float
    discounts: float
    items_sold: float
    orders: int
    avg_unit_price: float
    total_cost: Optional[float] = None
    gross_profit: Optional[float] = None
    margin_pct: Optional[float] = None
    share_pct: float
    growth_pct: Optional[float] = None
    previous_net_revenue: Optional[float] = None
    status: str = "estavel"  # crescimento | queda | estavel | atencao_margem


class SalespersonPerformanceItem(BaseModel):
    salesperson: str
    region: str
    net_revenue: float
    gross_revenue: float
    discounts: float
    orders: int
    items_sold: float
    average_ticket: float
    gross_profit: Optional[float] = None
    margin_pct: Optional[float] = None
    share_pct: float
    vs_team_avg_pct: float
    growth_pct: Optional[float] = None
    top_category: str


class RegionBreakdownItem(BaseModel):
    region: str
    net_revenue: float
    orders: int
    items_sold: float
    average_ticket: float
    share_pct: float
    gross_profit: Optional[float] = None
    margin_pct: Optional[float] = None


class DashboardResponse(BaseModel):
    has_data: bool
    is_demo_active: bool
    real_records_count: int
    demo_records_count: int
    kpis: KPIMetrics
    revenue_evolution: List[RevenueEvolutionPoint]
    sales_by_category: List[CategoryBreakdownItem]
    top_products: List[ProductPerformanceItem]
    salesperson_performance: List[SalespersonPerformanceItem]
    sales_by_region: List[RegionBreakdownItem]


class RowIssue(BaseModel):
    row_number: int
    field: str
    issue_type: str
    severity: str  # error | warning
    description: str
    raw_value: Optional[str] = None


class QualitySummary(BaseModel):
    total_rows_read: int
    valid_rows_count: int
    invalid_rows_count: int
    duplicate_rows_count: int
    already_imported_rows_count: int
    has_cost_column: bool
    missing_columns: List[str]
    detected_columns: List[str]
    mapped_columns: Dict[str, str]
    issue_counts_by_type: Dict[str, int]
    issues: List[RowIssue]


class ImportPreviewResponse(BaseModel):
    batch_id: int
    filename: str
    file_hash: str
    is_duplicate_file: bool
    can_import: bool
    records_to_import: int
    quality: QualitySummary
    preview_rows: List[Dict[str, Any]]


class ImportBatchInfo(BaseModel):
    id: int
    filename: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    has_cost_column: bool
    is_demo: bool
    status: str
    created_at: datetime


class SmartAlert(BaseModel):
    id: str
    title: str
    category: str  # queda_produto | crescimento_categoria | vendedor_abaixo_media | margem_baixa | concentracao | variacao_faturamento | queda_periodo
    severity: str  # alta | media | positiva | informativa
    metric_label: str
    metric_value: str
    observed_fact: str
    statistical_justification: str
    possible_explanation: str
    investigation_hypothesis: str
    affected_entity: str


class AnalysisResponse(BaseModel):
    has_data: bool
    summary: Dict[str, Any]
    alerts: List[SmartAlert]
    concentration_top3_pct: float
    concentration_top5_pct: float
    team_average_revenue: float


class AssistantQueryRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category: Optional[str] = None
    product: Optional[str] = None
    salesperson: Optional[str] = None
    region: Optional[str] = None


class AssistantQueryResponse(BaseModel):
    question: str
    intent: str
    answer: str
    mode: str  # deterministic | openai | gemini | fallback_deterministic
    provider_status: str
    sufficient_data: bool
    applied_filters: Dict[str, Any]
    calculated_indicators: Dict[str, Any]
    supporting_table: List[Dict[str, Any]]
    methodology_note: str


class ExecutiveReportResponse(BaseModel):
    generated_at: str
    applied_filters: Dict[str, Any]
    executive_summary: str
    kpis: KPIMetrics
    revenue_evolution: List[RevenueEvolutionPoint]
    top_products: List[ProductPerformanceItem]
    category_performance: List[CategoryBreakdownItem]
    salesperson_performance: List[SalespersonPerformanceItem]
    alerts: List[SmartAlert]
    recommendations: List[Dict[str, str]]


class SettingsResponse(BaseModel):
    ai_provider: str
    openai_configured: bool
    openai_key_masked: str
    openai_model: str
    gemini_configured: bool
    gemini_key_masked: str
    gemini_model: str
    max_upload_size_mb: int
    total_records: int
    demo_records: int
    real_records: int


class SettingsUpdateRequest(BaseModel):
    ai_provider: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
