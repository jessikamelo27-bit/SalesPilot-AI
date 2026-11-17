export interface FilterState {
  start_date: string;
  end_date: string;
  category: string;
  product: string;
  salesperson: string;
  region: string;
}

export interface FilterOptionsResponse {
  categories: string[];
  products: string[];
  salespeople: string[];
  regions: string[];
  min_date: string | null;
  max_date: string | null;
  total_records: number;
  demo_records: number;
  real_records: number;
  has_cost_data: boolean;
}

export interface KPIMetrics {
  gross_revenue: number;
  total_discounts: number;
  net_revenue: number;
  total_orders: number;
  total_items_sold: number;
  average_ticket: number;
  total_cost: number | null;
  gross_profit: number | null;
  profit_margin_pct: number | null;
  has_cost_data: boolean;
  cost_coverage_pct: number;
  previous_net_revenue: number | null;
  revenue_growth_pct: number | null;
  previous_orders: number | null;
  orders_growth_pct: number | null;
  previous_average_ticket: number | null;
  ticket_growth_pct: number | null;
  previous_gross_profit: number | null;
  profit_growth_pct: number | null;
  period_label: string;
  previous_period_label: string;
}

export interface RevenueEvolutionPoint {
  period: string;
  gross_revenue: number;
  net_revenue: number;
  gross_profit: number | null;
  orders: number;
  items_sold: number;
  previous_net_revenue: number | null;
}

export interface CategoryBreakdownItem {
  category: string;
  net_revenue: number;
  gross_revenue: number;
  items_sold: number;
  orders: number;
  share_pct: number;
  gross_profit: number | null;
  margin_pct: number | null;
  growth_pct: number | null;
}

export interface ProductPerformanceItem {
  product: string;
  category: string;
  net_revenue: number;
  gross_revenue: number;
  discounts: number;
  items_sold: number;
  orders: number;
  avg_unit_price: number;
  total_cost: number | null;
  gross_profit: number | null;
  margin_pct: number | null;
  share_pct: number;
  growth_pct: number | null;
  previous_net_revenue: number | null;
  status: 'crescimento' | 'queda' | 'estavel' | 'atencao_margem';
}

export interface SalespersonPerformanceItem {
  salesperson: string;
  region: string;
  net_revenue: number;
  gross_revenue: number;
  discounts: number;
  orders: number;
  items_sold: number;
  average_ticket: number;
  gross_profit: number | null;
  margin_pct: number | null;
  share_pct: number;
  vs_team_avg_pct: number;
  growth_pct: number | null;
  top_category: string;
}

export interface RegionBreakdownItem {
  region: string;
  net_revenue: number;
  orders: number;
  items_sold: number;
  average_ticket: number;
  share_pct: number;
  gross_profit: number | null;
  margin_pct: number | null;
}

export interface DashboardResponse {
  has_data: boolean;
  is_demo_active: boolean;
  real_records_count: number;
  demo_records_count: number;
  kpis: KPIMetrics;
  revenue_evolution: RevenueEvolutionPoint[];
  sales_by_category: CategoryBreakdownItem[];
  top_products: ProductPerformanceItem[];
  salesperson_performance: SalespersonPerformanceItem[];
  sales_by_region: RegionBreakdownItem[];
}

export interface RowIssue {
  row_number: number;
  field: string;
  issue_type: string;
  severity: 'error' | 'warning';
  description: string;
  raw_value: string | null;
}

export interface QualitySummary {
  total_rows_read: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  duplicate_rows_count: number;
  already_imported_rows_count: number;
  has_cost_column: boolean;
  missing_columns: string[];
  detected_columns: string[];
  mapped_columns: Record<string, string>;
  issue_counts_by_type: Record<string, number>;
  issues: RowIssue[];
}

export interface ImportPreviewResponse {
  batch_id: number;
  filename: string;
  file_hash: string;
  is_duplicate_file: boolean;
  can_import: boolean;
  records_to_import: number;
  quality: QualitySummary;
  preview_rows: Array<Record<string, any>>;
}

export interface ImportBatchInfo {
  id: number;
  filename: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  has_cost_column: boolean;
  is_demo: boolean;
  status: string;
  created_at: string;
}

export interface SmartAlert {
  id: string;
  title: string;
  category: string;
  severity: 'alta' | 'media' | 'positiva' | 'informativa';
  metric_label: string;
  metric_value: string;
  observed_fact: string;
  statistical_justification: string;
  possible_explanation: string;
  investigation_hypothesis: string;
  affected_entity: string;
}

export interface AnalysisResponse {
  has_data: boolean;
  summary: {
    total_alerts: number;
    high_severity: number;
    medium_severity: number;
    positive_highlights: number;
    period_analyzed?: string;
    comparison_period?: string;
  };
  alerts: SmartAlert[];
  concentration_top3_pct: number;
  concentration_top5_pct: number;
  team_average_revenue: number;
}

export interface AssistantQueryResponse {
  question: string;
  intent: string;
  answer: string;
  mode: 'deterministic' | 'openai' | 'gemini' | 'fallback_deterministic';
  provider_status: string;
  sufficient_data: boolean;
  applied_filters: Record<string, any>;
  calculated_indicators: Record<string, any>;
  supporting_table: Array<Record<string, any>>;
  methodology_note: string;
}

export interface ExecutiveReportResponse {
  generated_at: string;
  applied_filters: Record<string, string>;
  executive_summary: string;
  kpis: KPIMetrics;
  revenue_evolution: RevenueEvolutionPoint[];
  top_products: ProductPerformanceItem[];
  category_performance: CategoryBreakdownItem[];
  salesperson_performance: SalespersonPerformanceItem[];
  alerts: SmartAlert[];
  recommendations: Array<{
    area: string;
    priority: string;
    action: string;
    basis: string;
  }>;
}

export interface SettingsResponse {
  ai_provider: string;
  openai_configured: boolean;
  openai_key_masked: string;
  openai_model: string;
  gemini_configured: boolean;
  gemini_key_masked: string;
  gemini_model: string;
  max_upload_size_mb: number;
  total_records: number;
  demo_records: number;
  real_records: number;
}
