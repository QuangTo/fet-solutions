# API and Database Setup

## Stack

- Database: Supabase Postgres
- API: Next.js App Router Route Handlers
- Validation: Zod
- API composition root: `app/api/v1/[...path]/route.js` (legacy `/api/*` mirrors the same handler)
- API service and repository: `lib/server/*.js`
- Drizzle schema and database client: `lib/db.js`
- SQL migrations: `drizzle/migrations/*.sql`
- Drizzle config: `drizzle.config.js`

## Supabase Setup

1. Create a Supabase project.
2. Copy the Postgres connection string from Project Settings > Database.
3. Create `.env` from `.env.example` and set `DATABASE_URL`.
4. Run migrations:

```sh
npm run db:migrate
```

Reset and seed sample data:

```sh
npm run db:seed
```

`db:seed` truncates MVP business tables and recreates only org/site, catalog plan row, and one admin user (`123456789` / `123456789`). Site billing starts as **trialing** (30 days) with no subscriptions, invoices, or payments. Operational tables start empty for empty-state UI testing.

5. Start the app:

```sh
npm run dev
```

Default API base: `http://127.0.0.1:3000/api/v1`

## Role Model

Roles:

- `driver`: Tổng quan, Nhập hàng, Xuất hàng
- `warehouse`: Tổng quan, Nhập hàng, Xuất hàng
- `accountant`: Tổng quan, Báo cáo
- `admin`: toàn bộ hệ thống

Headers for authenticated calls:

```sh
x-user-id: user uuid after login
x-user-role: warehouse
x-user-name: Nguyen A
x-site-id: site uuid from login response
```

The API accepts old `accounting` values and normalizes them to `accountant`.

## Core Endpoints

```txt
GET    /api/v1/health
GET    /api/v1/ready
POST   /api/v1/users/login

GET    /api/v1/app-context?page=shell|accounting|dashboard
GET    /api/v1/dashboard-summary

GET    /api/v1/settings
PUT    /api/v1/settings/ui
PUT    /api/v1/settings/pageAccess

GET    /api/v1/sites
GET    /api/v1/billing
GET    /api/v1/billing/status
GET    /api/v1/plans
POST   /api/v1/billing/checkout
POST   /api/v1/billing/payments/:id/confirm
PATCH  /api/v1/billing/payments/:id/approve
GET    /api/v1/sites/:siteId/billing

GET    /api/v1/master-data
GET    /api/v1/receipt-data?page=1&pageSize=10
GET    /api/v1/dispatch-data?page=1&pageSize=10

GET    /api/v1/customers
POST   /api/v1/customers
PATCH  /api/v1/customers/:id
DELETE /api/v1/customers/:id

GET    /api/v1/vehicles
POST   /api/v1/vehicles
PATCH  /api/v1/vehicles/:id
DELETE /api/v1/vehicles/:id

GET    /api/v1/drivers
POST   /api/v1/drivers
PATCH  /api/v1/drivers/:id
DELETE /api/v1/drivers/:id

GET    /api/v1/users?page=1&pageSize=10
POST   /api/v1/users
PATCH  /api/v1/users/me/password
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

GET    /api/v1/receipts?page=1&pageSize=10
POST   /api/v1/receipts

GET    /api/v1/dispatches?page=1&pageSize=10
POST   /api/v1/dispatches

GET    /api/v1/inventory?customerId=

GET    /api/v1/accounting
GET    /api/v1/accounting/ready
GET    /api/v1/accounting/closures?page=1&pageSize=10
POST   /api/v1/accounting/closures

GET|POST|PATCH|DELETE /api/v1/warehouses
```

List endpoints default `pageSize=50` when omitted (max 100). UI tables use `pageSize=10`. Response shape:

`{ items, page, pageSize, total, pageCount }`

## Client data loading

| Screen | Primary API |
|--------|-------------|
| Shell / settings | `app-context?page=shell` |
| Dashboard | `dashboard-summary` |
| Nhập hàng | `receipt-data` |
| Xuất hàng | `dispatch-data` |
| Quản lý master | `master-data` |
| Báo cáo ready | `app-context?page=accounting` |
| Báo cáo lịch sử HĐ | `accounting/closures` |

## Important Business Rules

- Inventory is derived from `receipt_items - dispatch_items`; it is not manually edited.
- Operational data is scoped by `site_id`; clients pass `x-site-id` or `?siteId=...`.
- Tenant data endpoints require `x-user-id`; `POST /users/login`, `/health`, and `/ready` stay public.
- Write actions check site billing status and may return `BILLING_REQUIRED`.
- `POST /dispatches` checks available inventory inside a transaction before creating dispatch rows.
- Management deletes are soft deletes through `is_active = false`.
- Admin-created users require `name`, `phone`, and `role`; if no password is supplied, the phone number is used as the initial password.
- `POST /users/login` returns the public user session for phone/password login.
- Write actions create `audit_logs` rows.
- Invoice approval is unique per customer inventory closing timestamp.

## Example Login

```sh
curl -X POST http://127.0.0.1:3000/api/v1/users/login \
  -H 'content-type: application/json' \
  -d '{"phone":"123456789","password":"123456789"}'
```
