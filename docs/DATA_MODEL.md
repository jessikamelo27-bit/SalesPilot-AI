# SalesPilot AI — Data Model & Validation Specification

## 1. Relational Schema (SQLite / SQLAlchemy)

### 1.1 `sale_records`
Stores validated commercial line items.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `Integer` (PK) | No | Auto-incrementing primary key |
| `batch_id` | `Integer` (FK) | Yes | Foreign key referencing `import_batches.id` |
| `sale_date` | `Date` | No | Transaction date (`YYYY-MM-DD`, indexed) |
| `order_id` | `String(100)` | No | Order identifier (used via `COUNT(DISTINCT order_id)` for Average Ticket) |
| `product` | `String(200)` | No | Product / SKU name (indexed) |
| `category` | `String(120)` | No | Commercial category (indexed) |
| `quantity` | `Float` | No | Units sold (`> 0`) |
| `unit_price` | `Float` | No | Unit selling price (`> 0`) |
| `discount` | `Float` | No | Total line discount (`>= 0` and `<= 50%` of gross line value) |
| `unit_cost` | `Float` | **Yes** | Unit cost of the product (`NULL` when spreadsheet has no cost column) |
| `salesperson` | `String(150)` | No | Responsible salesperson (indexed) |
| `region` | `String(120)` | No | Geographic region (indexed) |
| `payment_method` | `String(100)` | No | Payment method (defaults to `"Não informado"` if omitted) |
| `is_demo` | `Boolean` | No | `True` for synthetic demo records; `False` for user-imported records |
| `row_hash` | `String(64)` | No | SHA-256 hash of `(order_id, product, sale_date, quantity, unit_price)` |

### 1.2 `import_batches`
Tracks file uploads, quality audit results, and staged records prior to user confirmation.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `Integer` (PK) | No | Batch identifier |
| `filename` | `String(255)` | No | Original uploaded filename |
| `file_hash` | `String(64)` | No | SHA-256 hash of file bytes to block duplicate file imports |
| `total_rows` | `Integer` | No | Total rows read from spreadsheet |
| `valid_rows` | `Integer` | No | Validated rows ready for import |
| `invalid_rows` | `Integer` | No | Rows flagged with validation errors |
| `duplicate_rows` | `Integer` | No | Rows duplicated within the file or already present in the database |
| `has_cost_column` | `Boolean` | No | Whether the file included product cost data |
| `is_demo` | `Boolean` | No | Whether this batch belongs to the synthetic demo dataset |
| `status` | `String(32)` | No | `pending`, `confirmed`, or `cancelled` |
| `quality_report_json`| `Text` | Yes | Serialized JSON quality report |
| `staged_records_json`| `Text` | Yes | Temporary staged records (cleared upon confirmation/cancellation) |
| `created_at` | `DateTime` | No | UTC timestamp |

### 1.3 `app_settings`
Key-value store for runtime AI provider preferences and masked credentials.

---

## 2. Data Quality Validation Rules

During `POST /api/imports/upload`, every row is inspected against the following rules:
- `venda_sem_data_ou_invalida`: Missing or unparseable transaction date.
- `pedido_sem_identificacao`: Empty order number.
- `produto_sem_identificacao`: Missing product name.
- `categoria_ausente`: Missing category.
- `quantidade_invalida` / `quantidade_negativa_ou_zero`: Non-numeric, zero, or negative quantity.
- `preco_unitario_invalido`: Non-numeric, zero, or negative unit price.
- `desconto_negativo` / `desconto_superior_ao_permitido`: Negative discount or discount exceeding 50% of gross line revenue.
- `custo_invalido`: Negative unit cost.
- `registro_sem_vendedor`: Missing salesperson name.
- `registro_sem_regiao`: Missing region.
- `pedido_duplicado`: Duplicate `(order_id, product)` pair within the same spreadsheet.
- `pedido_ja_importado`: Record already exists in `sale_records`.
