# SalesPilot AI — Quality Assurance, Testing & Evaluation

## 1. Automated Verification Suite (`pytest`)

The backend test suite (`backend/tests/`) validates 14 end-to-end and unit test scenarios across three modules:

### 1.1 `tests/test_metrics.py`
1. `test_financial_calculations_exact`: Verifies Gross Revenue, Discounts, Net Revenue, Total Cost, Gross Profit, and Profit Margin %.
2. `test_average_ticket_uses_unique_orders_not_items`: Verifies that multi-item orders sharing the same `order_id` are counted once in the Average Ticket denominator (`COUNT(DISTINCT order_id)`), never confusing order count with item quantity.
3. `test_missing_cost_does_not_invent_profit_or_margin`: Verifies that datasets without `unit_cost` return `has_cost_data = False` and `None` for cost/profit/margin.
4. `test_percentage_growth_and_zero_division_safety`: Verifies period-over-period growth and safe handling of zero/null denominators.
5. `test_csv_formula_injection_sanitization`: Verifies escaping of `=`, `+`, `-`, and `@` prefixes during CSV export.

### 1.2 `tests/test_importer.py`
6. `test_csv_import_and_duplicate_file_prevention`: Verifies CSV upload, staging preview, batch confirmation, and SHA-256 duplicate file blocking.
7. `test_xlsx_import_workflow`: Verifies Excel `.xlsx` upload and confirmation.
8. `test_data_quality_inconsistencies_and_in_file_duplicates_detected`: Verifies explicit reporting of missing dates, negative quantities, zero/invalid prices, missing product names, excessive discounts (`> 50%`), missing salespeople, and in-file duplicate orders.

### 1.3 `tests/test_assistant_and_filters.py`
9. `test_demo_load_clear_preserves_real_user_data`: Verifies that loading and clearing synthetic demo records (`is_demo = True`) strictly preserves real user-imported records (`is_demo = False`).
10. `test_dashboard_and_analysis_react_to_filters`: Verifies that KPIs, breakdowns, and statistical alerts react to category, salesperson, and regional filters.
11. `test_assistant_queries_all_core_intents`: Verifies all 10 core natural-language commercial questions against the deterministic analytics engine.
12. `test_assistant_insufficient_data_response`: Verifies `sufficient_data = False` when querying an empty dataset.
13. `test_assistant_fallback_without_ai_api_key`: Verifies graceful fallback (`mode = "fallback_deterministic"`) when `openai` is selected without an API key.
14. `test_reports_csv_and_pdf_exports`: Verifies executive report JSON, formula-safe CSV download, and valid PDF binary generation.

---

## 2. Intentional Scenarios in the Synthetic Demonstration Dataset

To allow immediate evaluation without requiring proprietary company spreadsheets, `demo_generator.py` creates 12 months of realistic synthetic data (`2025-11` to `2026-10`) containing five verifiable scenarios:
1. **Product in Sales Decline:** `Terminal POS Smart X2` experiences a sharp contraction in the second 6-month window.
2. **Category in Strong Expansion:** `Cloud & Infraestrutura` (`Enterprise Cloud Suite Pro` & `DataLake Analytics Node`) grows significantly across periods.
3. **Compressed Profit Margin SKU:** `Servidor Edge Rack 2U` operates at a low gross margin (`~9.5%`), triggering a high-priority margin alert.
4. **Salesperson Performance Dispersion:** `Mariana Costa` (Sudeste) outperforms the team average by `> +30%`, while `Bruno Silveira` (Norte) trails below `-25%` of the team mean.
5. **Anomalous Period Dip:** `2026-07` exhibits a pronounced drop (`Z-score < -1.2`), triggering a temporal anomaly alert.

> **Disclaimer:** Synthetic demonstration records are strictly flagged as demo data, and all analytical recommendations provided by the platform are auxiliary decision-support insights rather than guarantees of commercial performance.
