-- IMPORTANT: this is the only root platform admin bootstrap.
-- Keep exactly one root admin credential here unless ownership changes.
-- Login: 0373665129 / 123123

create extension if not exists pgcrypto;

update users
set is_platform_admin = false,
    updated_at = now()
where phone <> '0373665129'
  and is_platform_admin = true;

insert into users (
  display_name,
  phone,
  password_hash,
  role,
  is_active,
  is_platform_admin
)
values (
  'Root Admin',
  '0373665129',
  encode(digest('123123', 'sha256'), 'hex'),
  'admin',
  true,
  true
)
on conflict (phone) do update
set display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    role = 'admin',
    is_active = true,
    is_platform_admin = true,
    updated_at = now();
