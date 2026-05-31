create extension if not exists pgcrypto;

with root_admin as (
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
    'quangto',
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
      updated_at = now()
  returning id
),
demo_site as (
  select id
  from sites
  where public_slug = 'demo'
  limit 1
)
insert into site_memberships (site_id, user_id, role, is_active)
select demo_site.id, root_admin.id, 'admin', true
from demo_site
cross join root_admin
on conflict (site_id, user_id) do update
set role = 'admin',
    is_active = true,
    updated_at = now();
