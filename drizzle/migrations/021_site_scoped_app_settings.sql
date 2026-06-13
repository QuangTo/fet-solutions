-- IMPORTANT: site-scoped app settings.
-- UI/page-access settings are now stored per site instead of globally by key.

alter table app_settings add column if not exists id uuid default gen_random_uuid();
alter table app_settings add column if not exists site_id uuid references sites(id) on delete cascade;

update app_settings
set site_id = (
  select id
  from sites
  order by created_at asc, id asc
  limit 1
)
where site_id is null
  and exists (select 1 from sites);

alter table app_settings drop constraint if exists app_settings_pkey;
alter table app_settings alter column id set not null;
alter table app_settings add primary key (id);

create unique index if not exists app_settings_site_key_unique
  on app_settings (site_id, key)
  where site_id is not null;

create unique index if not exists app_settings_global_key_unique
  on app_settings (key)
  where site_id is null;
