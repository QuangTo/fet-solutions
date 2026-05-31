# Root Tenant Sites

## Current Root Tenant Rollout

FES now supports these root tenant URLs:

```txt
https://fes.vercel.app/
https://fes.vercel.app/demo
https://fes.vercel.app/demo/dang-nhap
https://fes.vercel.app/demo/tong-quan
https://fes.vercel.app/demo/nhap-hang
https://fes.vercel.app/demo/xuat-hang
https://fes.vercel.app/demo/bao-cao
https://fes.vercel.app/demo/quan-ly
https://fes.vercel.app/demo/cai-dat

https://fes.vercel.app/vantaianhquoc
https://fes.vercel.app/vantaianhquoc/dang-nhap
https://fes.vercel.app/vantaianhquoc/tong-quan
https://fes.vercel.app/vantaianhquoc/nhap-hang
https://fes.vercel.app/vantaianhquoc/xuat-hang
https://fes.vercel.app/vantaianhquoc/bao-cao
https://fes.vercel.app/vantaianhquoc/quan-ly
https://fes.vercel.app/vantaianhquoc/cai-dat
```

The bare root `/` redirects to `/demo`, so the default public login flow is the
demo tenant.

Both routes reuse the existing FES App Shell. They do not fork UI code.
Client navigation is scoped through a route base (`/demo` or
`/vantaianhquoc`), so the old direct routes such as `/dang-nhap` and
`/tong-quan` can keep working while root tenant sites are rolled out.

## Database Source Of Truth

Tenant routing should be managed in the database, not in a production JSON file.
The tenant-facing URL slug lives on `sites.public_slug`.

For the initial rollout:

```txt
sites.code = default
sites.public_slug = demo

sites.code = main
sites.public_slug = vantaianhquoc
```

Migration `015_site_public_slug.sql` adds the column, backfills the existing
default site to `demo`, and creates a unique index.

Migration `016_vantaianhquoc_site.sql` creates the first real customer site:

```txt
organization slug = vantaianhquoc
site public_slug = vantaianhquoc
site status = active
billing_status = trialing
trial length = 30 days
default warehouse = MAIN
admin phone = 123456789
```

The seed script creates the default operational site as `Demo Site` with
`public_slug = demo`, and also creates the `vantaianhquoc` site with the same
admin account membership.

## Login And Session Behavior

When the user logs in from `/demo/dang-nhap` or
`/vantaianhquoc/dang-nhap`, the client sends the matching slug:

```json
{
  "phone": "...",
  "password": "...",
  "siteSlug": "vantaianhquoc"
}
```

The login service verifies that the user has an active `site_memberships` row
for the site with the requested `sites.public_slug`. The signed `fes_session`
cookie continues to carry the active `siteId`, which keeps existing API
handlers working because they already scope reads/writes with `user.siteId`.

Client display state is stored under a tenant-scoped localStorage key:

```txt
fet-logistics-session:demo
fet-logistics-session:vantaianhquoc
```

The cookie remains httpOnly and is still the server authority.

## Route Guard

Only `demo` and `vantaianhquoc` are enabled as root tenant slugs right now.
The route file rejects unknown root slugs with `notFound()`.

Allowed tenant paths are:

```txt
/
/dang-nhap
/tong-quan
/nhap-hang
/xuat-hang
/bao-cao
/quan-ly
/cai-dat
```

Before enabling more customer slugs like `/khachhang-a`, add a tenant admin flow that
creates `sites.public_slug` records and validates reserved words.

## Reserved Slugs To Block

Root tenant slugs must not collide with system routes or future admin routes.
Block at least:

```txt
api
_next
admin
site-admin
dang-nhap
tong-quan
nhap-hang
xuat-hang
bao-cao
quan-ly
cai-dat
health
ready
```

Recommended slug format:

```txt
lowercase kebab-case, ASCII only, 3-80 characters
```

Examples:

```txt
demo
khach-hang-a
cong-ty-minh-long
```

## Next Implementation Steps

1. Add a Tenant Admin screen for FES admin users.
2. Create `POST /api/v1/sites` for creating a site, organization, first admin
   membership, subscription, and default warehouse in one transaction.
3. Add server-side reserved slug validation.
4. Add a site switcher for users that belong to multiple sites.
5. Add archive and deletion workflows with dry-run counts before any hard
   purge.
6. Add tests for cross-tenant isolation: a session for site A must never read or
   write site B data.

## Deletion Safety Direction

Hard delete must not be a direct one-click action. Use this sequence:

```txt
active -> archived -> pending_delete -> purged
```

The danger-zone UI should require typing both the public slug and a confirmation
phrase, then show dry-run counts for receipts, dispatches, customers, vehicles,
drivers, users, invoices, payments, and audit logs.

Operational tables already use `site_id`, so purge can be scoped by `site_id`.
Keep a permanent audit record of who requested, approved, and executed the
purge.
