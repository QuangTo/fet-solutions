# API and Database Setup

## Stack

- Database: Supabase Postgres
- API: Next.js App Router Route Handlers
- Validation: Zod
- API composition root: `app/api/[...path]/route.js`
- API service and repository: `lib/server/*.js`
- Drizzle schema and database client: `lib/db.js`
- SQL migrations: `drizzle/migrations/*.sql`
- Drizzle config: `drizzle.config.js`

This setup is intentionally small for an MVP with fewer than 100 users. Next.js serves the pages and API from one monolith, while `lib/server/repository.js` keeps larger cross-domain queries out of the route handler.

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

When schema changes later, update `lib/db.js` first and generate a draft migration with:

```sh
npm run db:generate
```

5. Start the app and API:

```sh
npm run dev
```

Default local API URL: `http://127.0.0.1:3000/api` or the port selected by Next.js.

## Role Model

Roles:

- `driver`: Tổng quan, Nhập hàng, Xuất hàng
- `warehouse`: Tổng quan, Nhập hàng, Xuất hàng
- `accountant`: Tổng quan, Báo cáo
- `admin`: toàn bộ hệ thống

For MVP testing, pass the role with headers:

```sh
x-user-id: user uuid after login
x-user-role: warehouse
x-user-name: Nguyen A
x-site-id: site uuid from login response
```

The API accepts old `accounting` values and normalizes them to `accountant`.

## Core Endpoints

```txt
GET    /api/health
GET    /api/access
GET    /api/settings
PUT    /api/settings/ui
PUT    /api/settings/pageAccess
GET    /api/sites
GET    /api/billing
GET    /api/sites/:siteId/billing

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

GET    /api/users
POST   /api/users
POST   /api/users/login
PATCH  /api/users/me/password
PATCH  /api/users/:id
DELETE /api/users/:id

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
- Operational data is scoped by `site_id`; clients pass `x-site-id` or `?siteId=...`.
- Tenant data endpoints require `x-user-id`; `POST /api/users/login`, `/health`, `/ready`, and `/access` stay public.
- Write actions check site billing status and may return `BILLING_REQUIRED`.
- `POST /api/dispatches` checks available inventory inside a transaction before creating dispatch rows.
- Management deletes are soft deletes through `is_active = false`.
- Admin-created users require `name`, `phone`, and `role`; if no password is supplied, the phone number is used as the initial password.
- `POST /api/users/login` returns the public user session for phone/password login. `PATCH /api/users/me/password` requires `x-user-id`.
- Write actions create `audit_logs` rows.
- Invoice approval is unique per customer inventory closing timestamp, so one customer can close multiple invoices on the same day across separate completed receipt/dispatch cycles.

## Example Requests

Create a customer:

```sh
curl -X POST http://127.0.0.1:3000/api/customers \
  -H 'content-type: application/json' \
  -H 'x-user-id: USER_UUID' \
  -H 'x-user-role: warehouse' \
  -H 'x-site-id: SITE_UUID' \
  -d '{"name":"ABC Logistics"}'
```

Create a receipt:

```sh
curl -X POST http://127.0.0.1:3000/api/receipts \
  -H 'content-type: application/json' \
  -H 'x-user-id: USER_UUID' \
  -H 'x-user-role: warehouse' \
  -H 'x-user-name: Thu kho A' \
  -H 'x-site-id: SITE_UUID' \
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
curl -X POST http://127.0.0.1:3000/api/dispatches \
  -H 'content-type: application/json' \
  -H 'x-user-id: USER_UUID' \
  -H 'x-user-role: warehouse' \
  -H 'x-user-name: Thu kho A' \
  -H 'x-site-id: SITE_UUID' \
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
