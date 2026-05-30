# Agent Guide

## Product Shape

FET is a compact logistics SaaS for receiving customer goods, dispatching them by truck, and helping accounting close invoices when customer inventory reaches zero. Keep the app operational and data-dense, not marketing-like.

## Frontend Principles

- Use Next.js App Router pages under `app/` and shared UI under `components/`.
- Keep route files thin; shared logistics screens live in `components/fet/` and common primitives in `components/ui/`.
- Use TanStack Query for client data fetching and keep page transitions lazy-loaded with skeleton states.
- Use Tailwind tokens/classes from `app/globals.css` and `components/ui/`; destructive actions stay red and primary actions stay high-contrast.
- Preserve responsive behavior for warehouse and driver mobile use. Avoid nested cards and avoid layout shifts in repeated UI.

## Business Rules

- Inventory is derived from receipt and dispatch data, never edited directly.
- Dispatches must include customer, truck, driver, SKU, quantity, date, and warehouse user.
- Management data for customers, vehicles, and drivers is the source for dropdown choices.
- Editing management data should sync existing references where that keeps historical screens coherent.
- Invoice approval requires a confirmation dialog and writes to `invoiceApprovals`.

## Auth and CI

- API auth uses an httpOnly `fet_session` cookie signed with `SESSION_SECRET` (required in production). `middleware.js` guards `/api/v1/*`; the UI uses `credentials: include` and keeps display state in `localStorage` only.
- Run `npm test` and `npm run check` after JavaScript changes. GitHub Actions runs the same on `main`.

## Checks

- Run `npm run check` after JavaScript changes.
- API implementation changes live under `app/api/` and `lib/server/`; database setup and endpoint notes live in `docs/API_DB.md`.
- Use role values `driver`, `warehouse`, `accountant`, and `admin`; normalize old `accounting` values when reading legacy UI/session data.
- Dev server uses Next.js and requires the Node.js version supported by the installed Next release.
- Do not commit real customer data, secrets, database dumps, or generated build output unless explicitly requested.
