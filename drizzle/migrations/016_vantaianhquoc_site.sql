create extension if not exists pgcrypto;

with organization_upsert as (
  insert into organizations (name, slug, status)
  values ('Van Tai Anh Quoc', 'vantaianhquoc', 'active')
  on conflict (slug) do update
  set name = excluded.name,
      status = 'active',
      updated_at = now()
  returning id
),
site_upsert as (
  insert into sites (
    organization_id,
    name,
    code,
    public_slug,
    status,
    billing_status,
    trial_started_at,
    trial_ends_at
  )
  select
    id,
    'Van Tai Anh Quoc',
    'main',
    'vantaianhquoc',
    'active',
    'trialing',
    now(),
    now() + interval '30 days'
  from organization_upsert
  on conflict (organization_id, code) do update
  set name = excluded.name,
      public_slug = excluded.public_slug,
      status = 'active',
      billing_status = excluded.billing_status,
      updated_at = now()
  returning id
),
admin_upsert as (
  insert into users (display_name, phone, password_hash, role, is_active)
  values (
    'Admin',
    '123456789',
    encode(digest('123456789', 'sha256'), 'hex'),
    'admin',
    true
  )
  on conflict (phone) do update
  set role = 'admin',
      is_active = true,
      updated_at = now()
  returning id
),
plan_pick as (
  select id
  from plans
  where code = 'plus'
  limit 1
),
membership_upsert as (
  insert into site_memberships (site_id, user_id, role, is_active)
  select site_upsert.id, admin_upsert.id, 'admin', true
  from site_upsert
  cross join admin_upsert
  on conflict (site_id, user_id) do update
  set role = 'admin',
      is_active = true,
      updated_at = now()
  returning site_id
),
warehouse_upsert as (
  insert into warehouses (site_id, name, code, is_active)
  select id, 'Kho chinh', 'MAIN', true
  from site_upsert
  where not exists (
    select 1
    from warehouses existing
    where existing.site_id = site_upsert.id
      and existing.code = 'MAIN'
      and existing.is_active = true
  )
  returning site_id
)
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
  site_upsert.id,
  plan_pick.id,
  'trialing',
  now(),
  now() + interval '30 days',
  now() + interval '30 days',
  'manual_qr'
from site_upsert
left join plan_pick on true
where not exists (
  select 1
  from subscriptions existing
  where existing.site_id = site_upsert.id
);
