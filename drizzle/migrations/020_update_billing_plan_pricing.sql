insert into plans (
  code,
  name,
  price_monthly,
  currency,
  max_customers,
  max_users,
  max_vehicles,
  max_warehouses
)
values
  ('plus', 'Plus', 0, 'VND', 20, 5, 5, 1),
  ('pro', 'Pro', 99000, 'VND', 40, 15, 15, 5),
  ('vip', 'Vip', 199000, 'VND', 80, 25, 30, 10)
on conflict (code) do update
set name = excluded.name,
    price_monthly = excluded.price_monthly,
    currency = excluded.currency,
    max_customers = excluded.max_customers,
    max_users = excluded.max_users,
    max_vehicles = excluded.max_vehicles,
    max_warehouses = excluded.max_warehouses,
    is_active = true,
    updated_at = now();
