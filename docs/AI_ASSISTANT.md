# SalesPilot AI — Conversational Assistant Architecture & Guardrails

## 1. Core Rule: Deterministic Computation Before Generation

Language models are probabilistic token predictors—they should **never** be trusted to sum thousands of spreadsheet rows, calculate profit margins, or execute raw SQL strings against a production database.

In **SalesPilot AI**, the AI Assistant is architected so that:
1. **100% of data retrieval** uses validated, parameterized SQLAlchemy queries (`fetch_records_df`).
2. **100% of mathematical calculations** are executed in Python/Pandas (`calculate_kpi_metrics`, `build_product_performance`, `build_category_breakdown`, `build_salesperson_performance`).
3. **Optional LLMs (`OpenAI` or `Google Gemini`)** receive only the pre-calculated JSON indicators and are strictly instructed to synthesize a clear executive explanation without altering or inventing any number.

---

## 2. The 10-Step Safe Execution Pipeline

1. **Question Reception:** Receives `AssistantQueryRequest` containing the natural-language question and any active UI filters.
2. **Intent Classification (`detect_intent`):** Maps the question to a verified analytical intent:
   - `faturamento_periodo`
   - `produto_mais_vendido`
   - `categoria_maior_crescimento`
   - `desempenho_categorias`
   - `produtos_em_queda`
   - `desempenho_vendedores`
   - `desempenho_regioes`
   - `ticket_medio`
   - `produtos_menor_margem` / `lucro_e_margem`
   - `comparacao_periodos`
   - `diagnostico_queda_faturamento`
   - `pontos_de_atencao` / `resumo_geral`
3. **Implicit Filter Extraction (`extract_implicit_filters`):** Detects references to *"este mês"* / *"neste mês"*, categories, salespeople, or regions mentioned in the prompt and merges them with explicit UI filters.
4. **Parameterized Data Query:** Executes safe SQLAlchemy `SELECT` statements with bound parameters.
5. **Python/Pandas Calculation:** Computes exact KPIs, period-over-period growth rates, and supporting tables.
6. **Context Construction:** Packages `calculated_indicators`, `supporting_table`, and `methodology_note`.
7. **Optional LLM Synthesis (`call_optional_llm`):**
   - If `ai_provider == "deterministic"`, returns the deterministic analytical narrative immediately.
   - If `ai_provider` is `"openai"` or `"gemini"` and a valid key is configured, sends the structured indicators with `temperature = 0.1`.
   - If an API key is missing or an HTTP error occurs, transparently falls back to `mode = "fallback_deterministic"` without faking an LLM response.
8. **Response Generation:** Produces the final executive text.
9. **Audit Trail Exposure:** Returns `calculated_indicators`, `applied_filters`, `supporting_table`, and `methodology_note` alongside the answer so the user can verify every number.
10. **Insufficient Data Handling:** When the database is empty or filters match zero records, returns `sufficient_data = False` with clear guidance.
