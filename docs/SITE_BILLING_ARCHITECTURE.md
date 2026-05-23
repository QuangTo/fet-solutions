# Site and Billing Architecture Notes

## Implemented Foundation

- `organizations` and `sites` model the SaaS customer boundary.
- Existing operational data is scoped with `site_id`: customers, vehicles, drivers, receipts, dispatches, invoice approvals, and audit logs.
- `site_memberships` stores per-site roles, so one user can belong to multiple sites with different roles.
- `plans`, `subscriptions`, `billing_invoices`, and `payments` provide the billing/payment foundation.
- Write APIs call a billing guard and can return `BILLING_REQUIRED` when a site is expired, suspended, canceled, or past due.
- User management is scoped to the active site: listing users reads `site_memberships`, and delete deactivates the membership before disabling the global user.
- Existing UI keeps working through the default site created by migration `007_site_billing_foundation.sql`.

## Implemented API Surface

```txt
GET /api/sites
GET /api/billing
GET /api/sites/:siteId/billing
```

Existing operational endpoints remain available and are now site-aware through `x-site-id` or `?siteId=...`. Tenant data endpoints require a logged-in user header/session.

## UI Still Not Implemented

- Site management screen: create/edit sites and switch active site.
- Dedicated member management by site: invite flow, role history, multiple site assignments from one screen.
- Billing screen: plan, trial end date, invoice list, payment status, checkout/manual payment action.
- Billing lock state in UI: read-only banners and disabled write actions when `BILLING_REQUIRED`.
- Super-admin view for multiple organizations/sites.

## Next Backend Steps

- Replace header-based auth with Supabase Auth/session verification.
- Enable Supabase RLS policies on `site_id` tables.
- Add payment provider webhook endpoint when Stripe/Paddle/bank transfer flow is chosen.
- Add paginated domain APIs for large operational tables.
