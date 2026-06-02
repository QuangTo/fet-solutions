# Root Tenant Sites

## Current Root Tenant Rollout

LMS currently keeps a minimal root tenant route for the app shell:

```txt
https://lms.vercel.app/
https://lms.vercel.app/demo
https://lms.vercel.app/demo/dang-nhap
https://lms.vercel.app/demo/tong-quan
https://lms.vercel.app/demo/nhap-hang
https://lms.vercel.app/demo/xuat-hang
https://lms.vercel.app/demo/bao-cao
https://lms.vercel.app/demo/quan-ly
https://lms.vercel.app/demo/cai-dat
```

The bare root `/` redirects to `/demo`.

## Database Source Of Truth

Tenant routing is managed in the database through `sites.public_slug`.

For a clean reset, the seed script creates only:

```txt
organizations.slug = default
sites.code = default
sites.public_slug = demo
```

No customer/demo operational users or sample logistics data are seeded.

## Root Platform Admin

Platform-level site management lives at:

```txt
https://lms.vercel.app/site-admin
```

The only seeded/root platform admin is:

```txt
phone = 0373665129
password = 123123
```

`/site-admin` verifies `users.is_platform_admin = true` from the database before
returning or mutating tenant data.

## Platform APIs

```txt
GET   /api/v1/platform/sites
POST  /api/v1/platform/sites
PATCH /api/v1/platform/sites/:siteId
GET   /api/v1/platform/billing
PATCH /api/v1/platform/payments/:id/approve
PATCH /api/v1/platform/payments/:id/reject
```

## Deletion Safety Direction

Hard delete must not be a direct one-click action. Use this sequence:

```txt
select tenant -> dry-run impacted rows -> confirm -> archive/disable first -> hard delete only from a controlled script
```
