with default_site as (
  update sites s
  set billing_status = 'active',
      trial_started_at = least(s.trial_started_at, now() - interval '45 days'),
      trial_ends_at = least(s.trial_ends_at, now() - interval '15 days'),
      updated_at = now()
  from organizations o
  where o.id = s.organization_id
    and o.slug = 'default'
    and s.code = 'default'
  returning s.id
),
starter_plan as (
  insert into plans (code, name, price_monthly, currency, max_users, max_vehicles)
  values ('starter', 'Starter', 990000, 'VND', 20, 20)
  on conflict (code) do update
  set name = excluded.name,
      price_monthly = excluded.price_monthly,
      currency = excluded.currency,
      max_users = excluded.max_users,
      max_vehicles = excluded.max_vehicles,
      updated_at = now()
  returning id
),
active_subscription as (
  insert into subscriptions (
    site_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    trial_ends_at,
    provider
  )
  select
    ds.id,
    sp.id,
    'active',
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    null,
    'manual_qr'
  from default_site ds
  cross join starter_plan sp
  where not exists (
    select 1
    from subscriptions existing
    where existing.site_id = ds.id
      and existing.status = 'active'
  )
  returning id, site_id
),
resolved_subscription as (
  select id, site_id
  from (
    select id, site_id, 0 as priority from active_subscription
    union all
    select sub.id, sub.site_id, 1 as priority
    from subscriptions sub
    join default_site ds on ds.id = sub.site_id
    where sub.status = 'active'
    union all
    select sub.id, sub.site_id, 2 as priority
    from subscriptions sub
    join default_site ds on ds.id = sub.site_id
  ) candidates
  order by priority
  limit 1
),
paid_invoice as (
  insert into billing_invoices (
    site_id,
    subscription_id,
    amount,
    currency,
    status,
    due_date,
    paid_at,
    provider,
    provider_invoice_id
  )
  select
    rs.site_id,
    rs.id,
    990000,
    'VND',
    'paid',
    current_date,
    now() - interval '2 days',
    'manual_qr',
    'MOCK-PAID-001'
  from resolved_subscription rs
  where not exists (
    select 1
    from billing_invoices existing
    where existing.site_id = rs.site_id
      and existing.provider_invoice_id = 'MOCK-PAID-001'
  )
  returning id, site_id
)
insert into payments (
  site_id,
  invoice_id,
  provider,
  provider_payment_id,
  amount,
  currency,
  status,
  paid_at,
  meta
)
select
  pi.site_id,
  pi.id,
  'manual_qr',
  'MOCK-QR-001',
  990000,
  'VND',
  'succeeded',
  now() - interval '2 days',
  '{"method":"bank_qr","bank":"Mock Bank","note":"Default test site marked paid"}'::jsonb
from paid_invoice pi
where not exists (
  select 1
  from payments existing
  where existing.site_id = pi.site_id
    and existing.provider_payment_id = 'MOCK-QR-001'
);
