create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, code)
);

create index if not exists warehouses_site_active_idx
  on warehouses (site_id)
  where is_active = true;

insert into warehouses (site_id, name, code)
select s.id, 'Kho chính', 'MAIN'
from sites s
where not exists (
  select 1
  from warehouses w
  where w.site_id = s.id and w.code = 'MAIN'
);
