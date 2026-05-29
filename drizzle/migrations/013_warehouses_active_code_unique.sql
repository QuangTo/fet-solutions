alter table warehouses
  drop constraint if exists warehouses_site_id_code_key;

drop index if exists warehouses_site_code_active_unique;

create unique index warehouses_site_code_active_unique
  on warehouses (site_id, code)
  where is_active = true;
