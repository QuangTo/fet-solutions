# Agent Guide

## Product Shape

FET is a compact logistics SaaS for receiving customer goods, dispatching them by truck, and helping accounting close invoices when customer inventory reaches zero. Keep the app operational and data-dense, not marketing-like.

## Frontend Principles

- Prefer small modules in `src/ui/` for shared rendering, dialogs, tables, forms, and formatting before adding helpers to `src/app.js`.
- Keep `index.html` as the shell plus global overlays. Page markup belongs in `public/pages/*.html`.
- Render dynamic HTML through shared helpers such as `escapeHtml()`, `optionMarkup()`, `sampleTableRow()`, and pagination helpers.
- Use design tokens from `src/styles/tokens.css`; primary actions use `--accent`, destructive actions use `--red`, and text on solid action buttons is white.
- Preserve responsive behavior for warehouse and driver mobile use. Avoid nested cards and avoid layout shifts in repeated UI.

## Business Rules

- Inventory is derived from receipt and dispatch data, never edited directly.
- Dispatches must include customer, truck, driver, SKU, quantity, date, and warehouse user.
- Management data for customers, vehicles, and drivers is the source for dropdown choices.
- Editing management data should sync existing references where that keeps historical screens coherent.
- Invoice approval requires a confirmation dialog and writes to `invoiceApprovals`.

## Checks

- Run `npm run check` after JavaScript changes.
- API implementation changes live under `server-api/`; Vercel exposes only `api/[...path].js`; database setup and endpoint notes live in `docs/API_DB.md`.
- Use role values `driver`, `warehouse`, `accountant`, and `admin`; normalize old `accounting` values when reading legacy UI/session data.
- Dev server requires Node.js `20.19+` or `22.12+` because the installed Vite version depends on newer Node utilities.
- Do not commit real customer data, secrets, database dumps, or generated build output unless explicitly requested.
