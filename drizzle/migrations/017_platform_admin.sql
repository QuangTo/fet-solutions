alter table users add column if not exists is_platform_admin boolean not null default false;

create index if not exists users_platform_admin_idx
  on users (is_platform_admin)
  where is_platform_admin = true and is_active = true;
