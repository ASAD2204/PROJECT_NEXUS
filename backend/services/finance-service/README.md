# Finance Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> **Financial Management microservice for Project Nexus**

## Overview

The Finance Service handles fee management, invoice generation, Stripe payment processing, transaction history, and late fee enforcement. It integrates with Stripe for payment gateway functionality, validates protected requests against Redis-backed auth sessions, and publishes payment events to Kafka.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework |
| **PostgreSQL** | Primary database (SQLAlchemy ORM) |
| **Stripe** | Payment gateway (PaymentIntent API) |
| **Kafka** | Event producer (payment_processed) |
| **Redis** | Auth session validation |
| **Python 3.11** | Runtime |
| **Docker** | Containerization |

## File Structure

```
finance-service/
├── Dockerfile
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── config.py            # Settings & environment variables
    ├── database.py          # PostgreSQL engine + session
    ├── dependencies.py      # JWT + Redis session auth & role guard
    ├── kafka_producer.py    # Kafka event publisher
    ├── main.py              # FastAPI app entrypoint
    ├── models.py            # SQLAlchemy ORM models
    ├── routes.py            # All API endpoints
    └── schemas.py           # Pydantic request/response schemas
```

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | `str` | *required* | PostgreSQL connection string |
| `REDIS_URL` | `str` | `redis://redis:6379` | Redis connection string |
| `KAFKA_BROKER` | `str` | `kafka:9092` | Kafka broker address |
| `JWT_SECRET` | `str` | *required* | Secret key for JWT signing |
| `JWT_ALGORITHM` | `str` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | `int` | `60` | Token expiry in minutes |
| `STRIPE_SECRET_KEY` | `str` | `""` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | `str` | `""` | Stripe webhook signing secret |

## Database Models

### `FinFeeHead` — table `fin_fee_heads`
| Column | Type | Constraints |
|--------|------|-------------|
| `head_id` | Integer | PK, autoincrement |
| `title` | String(100) | — |
| `default_amount` | Numeric(10,2) | — |

### `FinInvoice` — table `fin_invoices`
| Column | Type | Constraints |
|--------|------|-------------|
| `invoice_id` | Integer | PK, autoincrement |
| `student_id` | Integer | FK → sis_students.student_id |
| `semester_id` | Integer | — |
| `total_amount` | Numeric(10,2) | — |
| `due_date` | Date | — |
| `status` | String(20) | default "Unpaid" |

### `FinInvoiceItem` — table `fin_invoice_items`
| Column | Type | Constraints |
|--------|------|-------------|
| `item_id` | Integer | PK, autoincrement |
| `invoice_id` | Integer | FK → fin_invoices.invoice_id |
| `head_id` | Integer | FK → fin_fee_heads.head_id |
| `amount` | Numeric(10,2) | — |

### `FinTransaction` — table `fin_transactions`
| Column | Type | Constraints |
|--------|------|-------------|
| `trx_id` | Integer | PK, autoincrement |
| `invoice_id` | Integer | FK → fin_invoices.invoice_id |
| `gateway_ref` | String(100) | — |
| `amount_paid` | Numeric(10,2) | — |
| `trx_date` | TIMESTAMP | server default now() |
| `method` | String(20) | — |

### `FinFine` — table `fin_fines`
| Column | Type | Constraints |
|--------|------|-------------|
| `fine_id` | Integer | PK, autoincrement |
| `invoice_id` | Integer | FK → fin_invoices.invoice_id |
| `days_overdue` | Integer | — |
| `fine_amount` | Numeric(10,2) | — |
| `applied_at` | TIMESTAMP | server default now() |

### `FinFeeStructure` — table `fin_fee_structure`
| Column | Type | Constraints |
|--------|------|-------------|
| `struct_id` | Integer | PK, autoincrement |
| `dept_id` | Integer | nullable |
| `program_id` | Integer | nullable |
| `semester_id` | Integer | nullable |
| `head_id` | Integer | FK → fin_fee_heads.head_id |
| `amount` | Numeric(10,2) | not null |

### Cross-Service Mirror
...

## API Endpoints

All endpoints are prefixed with `/api/v1/finance`.

### Fee Configuration
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | `GET` | `/fee-heads` | Yes | List all fee heads |
| 2 | `POST` | `/fee-heads` | Admin | Create a new fee head |
| 3 | `PUT` | `/fee-heads/{head_id}` | Admin | Update a fee head |
| 4 | `DELETE` | `/fee-heads/{head_id}` | Admin | Delete a fee head |
| 5 | `GET` | `/fee-structure` | Yes | List granular fee structures |
| 6 | `POST` | `/fee-structure` | Admin | Create a granular fee structure |
| 7 | `DELETE` | `/fee-structure/{struct_id}` | Admin | Delete a fee structure |

### Invoices & Ledger
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 8 | `GET` | `/invoices/me` | Yes | Get current student's invoices |
| 9 | `GET` | `/invoices` | Yes | List invoices (filtered by student/status) |
| 10 | `GET` | `/invoices/{invoice_id}` | Yes | Get detailed invoice by ID |
| 11 | `GET` | `/invoices/{invoice_id}/pdf` | Yes | Generate & download PDF invoice |
| 12 | `POST` | `/invoices` | Admin | Manually create a single invoice |
| 13 | `PUT` | `/invoices/{invoice_id}` | Admin | Update invoice fields |
| 14 | `DELETE` | `/invoices/{invoice_id}` | Admin | Delete invoice and dependent rows |
| 15 | `POST` | `/invoices/generate` | Admin | Bulk-generate invoices for students (supports granular structure + scholarships) |
| 16 | `GET` | `/ledger` | Yes | Financial ledger view (Admin: all, Student: own) |
| 17 | `GET` | `/ledger/export` | Admin | Export ledger as CSV |

### Payments & Fines
| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 18 | `POST` | `/payments/initiate` | Yes | Create a Stripe PaymentIntent |
| 19 | `POST` | `/payments/webhook` | No | Stripe webhook — marks invoice as Paid |
| 20 | `GET` | `/payments/history` | Yes | Get current student's payment transactions |
| 21 | `GET` | `/payments` | Yes | Frontend-compat payment list |
| 22 | `GET` | `/fines/me` | Yes | Get current student's fines |
| 23 | `GET` | `/fines` | Yes | List fines (filtered by invoice_id) |
| 24 | `POST` | `/fines/apply` | Admin | Apply 5% late fines to overdue unpaid invoices |
| 25 | `POST` | `/reminders` | Admin | Send payment reminder by student_id or roll_no |
| 26 | `GET` | `/health` | No | Health check |

## Kafka Producers

| Function | Topic | Payload |
|----------|-------|---------|
| `publish_payment_processed` | `payment_processed` | `{invoice_id, student_id, amount, event: "PAYMENT_PROCESSED"}` |

Called from the Stripe webhook handler after successful payment.

## Business Logic

- **Invoice Generation**: Creates one invoice per student with line items from all fee heads
- **Payment Flow**: Stripe PaymentIntent → webhook confirmation → mark invoice "Paid" → record transaction → publish Kafka event
- **Late Fine Enforcement**: 5% of total amount applied to all overdue unpaid invoices, status changed to "Overdue"

## Docker Configuration

| Property | Value |
|----------|-------|
| Base Image | `python:3.11-slim` |
| Exposed Port | `8000` |
| Healthcheck | `GET /health` (15s interval, 5s timeout, 3 retries) |
| Entrypoint | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

## Dependencies (requirements.txt)

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
python-jose[cryptography]
kafka-python
stripe
```
