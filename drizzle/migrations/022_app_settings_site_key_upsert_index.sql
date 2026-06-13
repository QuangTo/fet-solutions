-- IMPORTANT: make site-scoped app_settings compatible with ON CONFLICT.
-- Postgres cannot infer the partial index from `on conflict (site_id, key)`.

drop index if exists app_settings_site_key_unique;

create unique index if not exists app_settings_site_key_unique
  on app_settings (site_id, key);
