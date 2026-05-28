do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'warehouses_code_length_check'
  ) then
    alter table warehouses
      add constraint warehouses_code_length_check check (char_length(code) <= 9) not valid;
  end if;
end $$;

alter table receipts
  add column if not exists warehouse_id uuid references warehouses(id);

alter table dispatches
  add column if not exists warehouse_id uuid references warehouses(id);

update receipts r
set warehouse_id = (
  select id
  from warehouses
  where site_id = r.site_id and is_active = true
  order by name, code
  limit 1
)
where r.warehouse_id is null;

update dispatches d
set warehouse_id = (
    select id
    from warehouses
    where site_id = d.site_id and is_active = true
    order by name, code
    limit 1
  ),
    warehouse_name = coalesce(nullif(d.warehouse_name, ''), (
      select name
      from warehouses
      where site_id = d.site_id and is_active = true
      order by name, code
      limit 1
    ))
where d.warehouse_id is null;

update dispatches d
set warehouse_name = w.name
from warehouses w
where d.warehouse_id = w.id
  and nullif(d.warehouse_name, '') is null;

create index if not exists receipts_site_warehouse_date_idx
  on receipts (site_id, warehouse_id, received_date desc, created_at desc);

create index if not exists dispatches_site_warehouse_date_idx
  on dispatches (site_id, warehouse_id, dispatch_date desc, created_at desc);
