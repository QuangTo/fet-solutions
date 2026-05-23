create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  code text not null,
  status text not null default 'active',
  billing_status text not null default 'trialing',
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists site_memberships (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, user_id)
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_monthly numeric(14, 2) not null default 0,
  currency text not null default 'VND',
  max_users integer,
  max_vehicles integer,
  max_receipts_per_month integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  plan_id uuid references plans(id),
  status text not null default 'trialing',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_invoices (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount numeric(14, 2) not null,
  currency text not null default 'VND',
  status text not null default 'open',
  due_date date,
  paid_at timestamptz,
  provider text,
  provider_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  invoice_id uuid references billing_invoices(id) on delete set null,
  provider text,
  provider_payment_id text,
  amount numeric(14, 2) not null,
  currency text not null default 'VND',
  status text not null default 'pending',
  paid_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into organizations (name, slug)
values ('FET Default Organization', 'default')
on conflict (slug) do update
set updated_at = now()
returning id;

insert into sites (organization_id, name, code, billing_status)
select id, 'Default Site', 'default', 'trialing'
from organizations
where slug = 'default'
on conflict (organization_id, code) do update
set updated_at = now();

insert into plans (code, name, price_monthly, currency, max_users, max_vehicles)
values ('starter', 'Starter', 0, 'VND', 20, 20)
on conflict (code) do update
set updated_at = now();

insert into subscriptions (site_id, plan_id, status, trial_ends_at)
select s.id, p.id, 'trialing', s.trial_ends_at
from sites s
join organizations o on o.id = s.organization_id and o.slug = 'default'
left join plans p on p.code = 'starter'
where s.code = 'default'
  and not exists (
    select 1 from subscriptions existing where existing.site_id = s.id
  );

alter table customers add column if not exists site_id uuid references sites(id);
alter table vehicles add column if not exists site_id uuid references sites(id);
alter table drivers add column if not exists site_id uuid references sites(id);
alter table receipts add column if not exists site_id uuid references sites(id);
alter table dispatches add column if not exists site_id uuid references sites(id);
alter table invoice_approvals add column if not exists site_id uuid references sites(id);
alter table audit_logs add column if not exists site_id uuid references sites(id);

update customers set site_id = (select s.id from sites s join organizations o on o.id = s.organization_id where o.slug = 'default' and s.code = 'default' limit 1) where site_id is null;
update vehicles set site_id = (select s.id from sites s join organizations o on o.id = s.organization_id where o.slug = 'default' and s.code = 'default' limit 1) where site_id is null;
update drivers set site_id = (select s.id from sites s join organizations o on o.id = s.organization_id where o.slug = 'default' and s.code = 'default' limit 1) where site_id is null;
update receipts set site_id = (select s.id from sites s join organizations o on o.id = s.organization_id where o.slug = 'default' and s.code = 'default' limit 1) where site_id is null;
update dispatches set site_id = (select s.id from sites s join organizations o on o.id = s.organization_id where o.slug = 'default' and s.code = 'default' limit 1) where site_id is null;
update invoice_approvals set site_id = (select s.id from sites s join organizations o on o.id = s.organization_id where o.slug = 'default' and s.code = 'default' limit 1) where site_id is null;
update audit_logs set site_id = (select s.id from sites s join organizations o on o.id = s.organization_id where o.slug = 'default' and s.code = 'default' limit 1) where site_id is null;

alter table customers alter column site_id set not null;
alter table vehicles alter column site_id set not null;
alter table drivers alter column site_id set not null;
alter table receipts alter column site_id set not null;
alter table dispatches alter column site_id set not null;
alter table invoice_approvals alter column site_id set not null;

alter table customers drop constraint if exists customers_name_key;
alter table vehicles drop constraint if exists vehicles_plate_key;
alter table drivers drop constraint if exists drivers_name_key;

drop index if exists customers_name_key;
drop index if exists vehicles_plate_key;
drop index if exists drivers_name_key;
drop index if exists invoice_approvals_customer_period_closed_unique;

create unique index if not exists customers_site_name_unique on customers (site_id, name);
create unique index if not exists vehicles_site_plate_unique on vehicles (site_id, plate);
create unique index if not exists drivers_site_name_unique on drivers (site_id, name);
create unique index if not exists invoice_approvals_site_customer_period_closed_unique on invoice_approvals (site_id, customer_id, period_closed_at);

create index if not exists sites_org_status_idx on sites (organization_id, status);
create index if not exists site_memberships_user_idx on site_memberships (user_id, is_active);
create index if not exists subscriptions_site_status_idx on subscriptions (site_id, status);
create index if not exists billing_invoices_site_status_idx on billing_invoices (site_id, status, due_date desc);
create index if not exists payments_site_status_idx on payments (site_id, status, paid_at desc);
create index if not exists customers_site_active_idx on customers (site_id, is_active);
create index if not exists vehicles_site_active_idx on vehicles (site_id, is_active);
create index if not exists drivers_site_active_idx on drivers (site_id, is_active);
create index if not exists receipts_site_customer_date_idx on receipts (site_id, customer_id, received_date desc, created_at desc);
create index if not exists dispatches_site_customer_date_idx on dispatches (site_id, customer_id, dispatch_date desc, created_at desc);
create index if not exists invoice_approvals_site_customer_closed_idx on invoice_approvals (site_id, customer_id, period_closed_at desc);

insert into site_memberships (site_id, user_id, role)
select s.id, u.id, u.role::text
from users u
cross join (
  select s.id
  from sites s
  join organizations o on o.id = s.organization_id
  where o.slug = 'default' and s.code = 'default'
  limit 1
) s
on conflict (site_id, user_id) do update
set role = excluded.role,
    is_active = true,
    updated_at = now();
