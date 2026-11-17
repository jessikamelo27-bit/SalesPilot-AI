# SalesPilot AI — Intelligent Commercial Analytics & Conversational BI Platform

**SalesPilot AI** is a full-stack SaaS Business Intelligence and Commercial Analytics platform that combines deterministic financial data engineering in Python with an optional LLM-powered conversational assistant.

Built as an engineering showcase for applied AI in business decision-making, SalesPilot AI transforms raw commercial spreadsheets (`.CSV` and `.XLSX`) into verified KPIs, statistical anomaly alerts, executive reports, and natural-language insights—**without ever allowing a language model to invent numbers or execute arbitrary database queries**.

---

## 1. Business Problem Solved

Organizations frequently struggle with two extremes when analyzing sales performance:
1. **Static Spreadsheets & Dashboards:** Raw charts show *what* happened, but require manual cross-filtering to identify declining SKUs, compressed profit margins, revenue concentration risks, or underperforming territories.
2. **Unreliable "Chat-with-CSV" AI Wrappers:** Generic LLM tools attempt to perform arithmetic directly inside token predictions or generate unvalidated SQL, resulting in hallucinated financial metrics and security vulnerabilities.

**SalesPilot AI bridges this gap:**
- **100% Deterministic Financial Engine:** Every metric (Gross Revenue, Discounts, Net Revenue, Unique Orders, Average Ticket, Gross Profit, Profit Margin %, and Period-over-Period Growth) is computed deterministically in Python/Pandas over validated SQLite records.
- **Explicit Data Quality Auditing:** Malformed rows, negative quantities, excessive discounts, missing salespeople, and duplicate orders are never silently dropped—they are surfaced in an interactive pre-import audit report.
- **Fact vs. Hypothesis Separation:** Automated statistical diagnostics clearly distinguish between **Observed Fact**, **Statistical Justification**, **Possible Commercial Explanation**, and **Investigation Hypothesis**.

---

## 2. Core Features

- **Module 1 — Executive Dashboard:** 6 primary KPI cards with period-over-period growth comparisons and 6 interactive Recharts visualizations (Revenue & Profit Evolution, Period Comparison, Category Breakdown, Top Products, Salesperson Performance, and Regional Breakdown), all reactive to global filters.
- **Module 2 — Data Import & Quality Governance:** 10-step `.CSV` / `.XLSX` ingestion pipeline with flexible PT/EN column mapping, SHA-256 duplicate file & record prevention, row-level quality auditing, staging preview, and explicit Confirm/Cancel controls.
- **Module 3 — Intelligent Sales Analysis:** Statistical rule engine detecting SKU sales drops, expanding categories, compressed gross margins (`< 15%`), salesperson deviation from team mean, top-3 product revenue concentration (`CR3`), and temporal revenue dips (`Z-score`).
- **Module 4 — Conversational Sales Assistant:** Safe 10-step natural-language query pipeline supporting deterministic local execution by default and optional executive synthesis via **OpenAI** or **Google Gemini**.
- **Module 5 — Executive Reports & Safe Exports:** Consolidated executive reports respecting active filters with one-click export to **PDF** and **CSV** (hardened against Spreadsheet Formula Injection).

---

## 3. System Architecture & Technology Stack

### Backend (`backend/`)
- **Python 3.11+** & **FastAPI** (REST API, OpenAPI documentation, dependency injection)
- **Pandas & NumPy** (Deterministic vector calculations, time-series aggregation, Z-score & concentration statistics)
- **SQLAlchemy 2.0 & SQLite** (Parameterized ORM queries, staged import batches, runtime settings persistence)
- **Pydantic v2** (Strict request/response schema validation)
- **FPDF2 & OpenPyXL** (PDF report generation and Excel `.xlsx` parsing)
- **Pytest** (Automated test suite covering financial formulas, imports, duplicates, filters, and assistant fallback)

### Frontend (`frontend/`)
- **React 18**, **TypeScript**, & **Vite**
- **Tailwind CSS** & reusable **shadcn/ui-inspired** dark analytics components
- **Recharts** (Responsive interactive charts)
- **TanStack Query v5** (Reactive data fetching and cache invalidation across filters)
- **React Router v6** (8 connected application pages)
- **Lucide Icons**

---

## 4. Financial Formulas & Calculation Rules

All metrics are computed in `backend/app/services/metrics.py`:

$$\text{Gross Revenue} = \sum (\text{Quantity} \times \text{Unit Price})$$

$$\text{Total Discounts} = \sum \text{Discount}$$

$$\text{Net Revenue} = \text{Gross Revenue} - \text{Total Discounts}$$

$$\text{Total Cost} = \sum (\text{Quantity} \times \text{Unit Cost}) \quad \text{(Only when unit cost is present)}$$

$$\text{Estimated Gross Profit} = \text{Net Revenue} - \text{Total Cost}$$

$$\text{Profit Margin (\%)} = \left( \frac{\text{Estimated Gross Profit}}{\text{Net Revenue}} \right) \times 100$$

$$\text{Average Ticket} = \frac{\text{Net Revenue}}{\text{Count of Unique Orders }(\text{DISTINCT order\_id})}$$

$$\text{Period Growth (\%)} = \left( \frac{\text{Value}_{\text{current}} - \text{Value}_{\text{previous}}}{|\text{Value}_{\text{previous}}|} \right) \times 100$$

> **Data Integrity Safeguards:**
> - **Unique Orders vs. Item Quantity:** Average Ticket always divides Net Revenue by unique order IDs (`order_id.nunique()`), never by total items sold.
> - **Missing Cost Protection:** If an imported spreadsheet does not contain product costs (`unit_cost`), the platform never invents or estimates profit or margin—it explicitly reports those metrics as `Unavailable`.

---

## 5. How the Conversational AI Assistant Works

The assistant (`backend/app/services/assistant.py`) follows a strict 10-step safety pipeline:
1. Receive the user's natural-language question.
2. Classify the analytical intent (`faturamento_periodo`, `produto_mais_vendido`, `categoria_maior_crescimento`, `produtos_em_queda`, `desempenho_vendedores`, `ticket_medio`, `produtos_menor_margem`, `comparacao_periodos`, `diagnostico_queda_faturamento`, `pontos_de_atencao`).
3. Extract implicit temporal/entity filters and merge them with active UI filters.
4. Query the SQLite database exclusively via parameterized SQLAlchemy statements (**no LLM-generated SQL is ever executed**).
5. Compute exact indicators and supporting tables in Python/Pandas.
6. Construct a verified context object.
7. If an external LLM provider (`openai` or `gemini`) is configured, pass the pre-calculated indicators to the model for natural-language formatting under strict non-hallucination system instructions.
8. If no API key is configured (or if an external API error occurs), return the verified deterministic response transparently (`mode: "deterministic"` or `"fallback_deterministic"`).
9. Return the response alongside the exact **Calculated Indicators**, **Applied Filters**, **Methodology Note**, and **Supporting Evidence Table**.
10. Explicitly notify the user when there is insufficient data for the selected filter scope.

---

## 6. Installation & Local Execution

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**

### Step 1: Clone & Configure Environment
```bash
cp .env.example .env
```
*(No API keys are required to run the platform—it operates 100% deterministically out of the box).*

### Step 2: Start the Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- Backend API: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

### Step 3: Start the Frontend (React + Vite)
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
- Frontend Application: `http://localhost:5173`

---

## 7. Loading & Managing Synthetic Demonstration Data

- On first startup (when the database is empty), SalesPilot AI automatically seeds a **12-month synthetic demonstration dataset** (~960 line items across 8 products, 4 categories, 5 salespeople, and 5 regions) clearly labeled with a `Base Sintética de Demonstração Ativa` badge.
- You can click **"Carregar Demonstração"** or **"Limpar Demonstração"** in the global top bar (or in **Configurações**) at any time.
- **Real Data Preservation:** Clearing demonstration data removes only records flagged with `is_demo = True`, strictly preserving any real spreadsheets imported by the user (`is_demo = False`).

---

## 8. Configuring Optional OpenAI or Google Gemini Integration

You can configure an LLM provider in two ways:
1. **Via the Web UI:** Navigate to **Configurações** (`/configuracoes`), select **OpenAI (GPT)** or **Google Gemini**, enter your API key and preferred model (`gpt-4o-mini` or `gemini-2.5-flash`), and click **Salvar Configurações de IA**.
2. **Via `.env` file:** Set `AI_PROVIDER=openai` (with `OPENAI_API_KEY`) or `AI_PROVIDER=gemini` (with `GEMINI_API_KEY`).

---

## 9. Running Automated Tests

```bash
cd backend
.\.venv\Scripts\pytest -v
```

---

## 10. Known Limitations & Analytical Disclaimers

- **Synthetic Demo Data:** The built-in demonstration dataset is synthetically generated to showcase analytical scenarios (product sales decline, category expansion, low-margin SKU, salesperson variance, and a July revenue dip) and does not represent real company transactions.
- **Auxiliary Recommendations:** All diagnostic alerts and AI-assisted explanations are auxiliary decision-support analyses grounded in historical records; they do not prove external causal events nor guarantee future commercial outcomes.
- **Single-Tenant Local Persistence:** The default persistence layer uses local SQLite (`salespilot.db`) designed for portfolio evaluation and single-organization deployment.
