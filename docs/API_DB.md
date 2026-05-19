# API and Database Setup

## Stack

- Database: Supabase Postgres
- API: Express
- Validation: Zod
- Schema source: `server-api/db/schema.js`
- SQL migrations: `server-api/db/migrations/*.sql`
- Drizzle config: `drizzle.config.js`

This setup is intentionally small for an MVP with fewer than 100 users, while keeping the schema clean enough to move into a larger production setup later.

## Supabase Setup

1. Create a Supabase project.
2. Copy the Postgres connection string from Project Settings > Database.
3. Create `.env` from `.env.example` and set `DATABASE_URL`.
4. Run migrations:

```sh
npm run db:migrate
```

Seed clean sample data into Supabase:

```sh
npm run db:seed
```

`db:seed` truncates the MVP business tables and recreates sample customers, vehicles, drivers, receipts, dispatches, and one billing-ready customer.

When schema changes later, update `server-api/db/schema.js` first and generate a draft migration with:

```sh
npm run db:generate
```

5. Start the API:

```sh
npm run api
```

Default API URL: `http://127.0.0.1:4175`

## Role Model

Roles:

- `driver`: Tổng quan, Nhập hàng, Xuất hàng
- `warehouse`: Tổng quan, Nhập hàng, Xuất hàng, Quản lý
- `accountant`: Tổng quan, Báo cáo
- `admin`: toàn bộ hệ thống

For MVP testing, pass the role with headers:

```sh
x-user-role: warehouse
x-user-name: Nguyen A
```

The API accepts old `accounting` values and normalizes them to `accountant`.

## Core Endpoints

```txt
GET    /api/health
GET    /api/access

GET    /api/customers
POST   /api/customers
PATCH  /api/customers/:id
DELETE /api/customers/:id

GET    /api/vehicles
POST   /api/vehicles
PATCH  /api/vehicles/:id
DELETE /api/vehicles/:id

GET    /api/drivers
POST   /api/drivers
PATCH  /api/drivers/:id
DELETE /api/drivers/:id

GET    /api/receipts
POST   /api/receipts

GET    /api/dispatches
POST   /api/dispatches

GET    /api/inventory
GET    /api/reports/billing-ready
GET    /api/invoice-approvals
POST   /api/invoice-approvals
```

## Important Business Rules

- Inventory is derived from `receipt_items - dispatch_items`; it is not manually edited.
- `POST /api/dispatches` checks available inventory inside a transaction before creating dispatch rows.
- Management deletes are soft deletes through `is_active = false`.
- Write actions create `audit_logs` rows.
- Invoice approval is unique per customer and can be updated by reposting approval data.

## Example Requests

Create a customer:

```sh
curl -X POST http://127.0.0.1:4175/api/customers \
  -H 'content-type: application/json' \
  -H 'x-user-role: warehouse' \
  -d '{"name":"ABC Logistics"}'
```

Create a receipt:

```sh
curl -X POST http://127.0.0.1:4175/api/receipts \
  -H 'content-type: application/json' \
  -H 'x-user-role: warehouse' \
  -H 'x-user-name: Thu kho A' \
  -d '{
    "customerName": "ABC Logistics",
    "date": "2026-05-18",
    "items": [
      { "sku": "THEP", "quantity": 100, "unit": "tan" }
    ]
  }'
```

Create a dispatch:

```sh
curl -X POST http://127.0.0.1:4175/api/dispatches \
  -H 'content-type: application/json' \
  -H 'x-user-role: warehouse' \
  -H 'x-user-name: Thu kho A' \
  -d '{
    "customerName": "ABC Logistics",
    "plate": "51C-123.45",
    "driverName": "Nguyen Van A",
    "date": "2026-05-18",
    "items": [
      { "sku": "THEP", "quantity": 20, "unit": "tan" }
    ]
  }'
```
