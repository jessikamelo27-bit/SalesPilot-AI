# SalesPilot AI — System Architecture

## 1. Architectural Principles

SalesPilot AI is designed around four core engineering principles:
1. **Strict Separation of Concerns:** The React/TypeScript frontend is strictly a presentation and interaction layer. All financial formulas, period-over-period comparisons, statistical anomaly detection, and data quality rules reside in the Python/FastAPI backend.
2. **Deterministic-First Analytics:** No calculation is ever delegated to an LLM. Python/Pandas computes exact results over SQLAlchemy-queried records before any natural-language synthesis occurs.
3. **Zero Silent Data Loss:** During spreadsheet import, invalid or duplicate rows are never silently discarded. The backend stages valid rows and produces a full row-level audit report so the user can review and explicitly confirm or cancel.
4. **Resilient AI Integration:** External LLM providers (`OpenAI` and `Google Gemini`) are optional enhancers. The platform operates 100% locally in deterministic mode when no API key is present.

---

## 2. High-Level Component Diagram

```
+-----------------------------------------------------------------------+
|                        React + TypeScript SPA                         |
|  Pages: Dashboard | Import | Analysis | Products | Salespeople        |
|         AI Assistant | Reports | Settings                             |
|  State: TanStack Query + Global FilterContext                         |
+-----------------------------------+-----------------------------------+
                                    | REST API (JSON / Multipart / Binary)
                                    v
+-----------------------------------------------------------------------+
|                        FastAPI Backend Layer                          |
|  Routers: dashboard | data_import | analysis | assistant | reports     |
|           settings                                                    |
+-----------------------------------+-----------------------------------+
                                    |
        +---------------------------+---------------------------+
        |                                                       |
        v                                                       v
+-------------------------------+               +-------------------------------+
|   Deterministic Python Core   |               |   Optional LLM Adapter Layer  |
| - metrics.py (Pandas KPIs)    |-------------->| - OpenAI API (gpt-4o-mini)    |
| - importer.py (Quality Audit) |  Pre-computed | - Gemini API (gemini-2.5)     |
| - analyzer.py (Z-score / CR3) |   Context     | - Transparent Fallback        |
| - reporter.py (CSV / PDF)     |               +-------------------------------+
+---------------+---------------+
                | Parameterized SQLAlchemy 2.0 ORM
                v
+-------------------------------+
|     SQLite Database (.db)     |
| - sale_records                |
| - import_batches              |
| - app_settings                |
+-------------------------------+
```

---

## 3. Backend Module Breakdown

- `app/main.py`: FastAPI lifecycle management, CORS configuration, router registration, and initial synthetic demo seeding.
- `app/models.py`: SQLAlchemy 2.0 ORM entities (`SaleRecord`, `ImportBatch`, `AppSetting`).
- `app/schemas.py`: Pydantic v2 validation schemas for all requests and responses.
- `app/services/metrics.py`: Financial calculation engine, period splitting (`split_current_and_previous_df`), and chart series builders.
- `app/services/importer.py`: Multi-format (`.csv`, `.xlsx`) reader, column alias normalizer, row-level quality validator, and SHA-256 duplicate guard.
- `app/services/demo_generator.py`: Deterministic 12-month synthetic commercial dataset generator and selective cleaner (`is_demo=True`).
- `app/services/analyzer.py`: Statistical diagnostic engine separating Observed Fact, Statistical Justification, Possible Explanation, and Investigation Hypothesis.
- `app/services/assistant.py`: 10-step conversational BI pipeline with intent classification, implicit filter extraction, parameterized data retrieval, and optional LLM narrative synthesis.
- `app/services/reporter.py`: Executive report builder, formula-safe CSV exporter, and FPDF2 PDF generator.
