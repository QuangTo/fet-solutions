-- IMPORTANT: current product billing plan catalog.
-- Keep this in migrations so a clean database has selectable plans.

insert into plans (code, name, price_monthly, currency, max_users, max_vehicles)
values
  ('plus', 'Plus', 199000, 'VND', 5, 5),
  ('pro', 'Pro', 399000, 'VND', 15, 15),
  ('vip', 'Vip', 599000, 'VND', 30, 30)
on conflict (code) do update
set name = excluded.name,
    price_monthly = excluded.price_monthly,
    currency = excluded.currency,
    max_users = excluded.max_users,
    max_vehicles = excluded.max_vehicles,
    is_active = true,
    updated_at = now();

update plans
set is_active = false,
    updated_at = now()
where code = 'unlimited';
