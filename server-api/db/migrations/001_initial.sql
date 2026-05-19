create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'user_role'
  ) then
    create type user_role as enum ('driver', 'warehouse', 'accountant', 'admin');
  end if;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  role user_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  received_by_id uuid references users(id),
  received_by_name text not null default 'Thủ kho mẫu',
  received_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  sku text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit text not null default 'đơn vị',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid not null references drivers(id),
  warehouse_user_id uuid references users(id),
  warehouse_name text not null default 'Thủ kho mẫu',
  dispatch_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dispatch_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references dispatches(id) on delete cascade,
  sku text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit text not null default 'đơn vị',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_approvals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  approved_by_id uuid references users(id),
  approved_by_name text not null default 'Kế toán mẫu',
  approval_date date not null,
  status text not null default 'Hoàn thành',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  user_role user_role not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_receipts_customer_date on receipts(customer_id, received_date desc);
create index if not exists idx_receipt_items_sku on receipt_items(sku);
create index if not exists idx_dispatches_customer_date on dispatches(customer_id, dispatch_date desc);
create index if not exists idx_dispatch_items_sku on dispatch_items(sku);
create index if not exists idx_invoice_approvals_customer on invoice_approvals(customer_id);
