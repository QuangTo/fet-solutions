-- IMPORTANT: product billing plan catalog.
-- These rows are application configuration, not demo/customer data.

update plans
set is_active = false,
    updated_at = now()
where code = 'starter';

insert into plans (code, name, price_monthly, currency, max_users, max_vehicles)
values
  ('plus', 'Plus', 299000, 'VND', 10, 10),
  ('pro', 'Pro', 399000, 'VND', 15, 15),
  ('vip', 'VIP', 499000, 'VND', 30, 30),
  ('unlimited', 'Unlimited', 799000, 'VND', 99, 99)
on conflict (code) do update
set name = excluded.name,
    price_monthly = excluded.price_monthly,
    currency = excluded.currency,
    max_users = excluded.max_users,
    max_vehicles = excluded.max_vehicles,
    is_active = true,
    updated_at = now();

update subscriptions sub
set plan_id = plus_plan.id,
    updated_at = now()
from plans plus_plan
where plus_plan.code = 'plus'
  and (
    sub.plan_id is null
    or sub.plan_id in (select id from plans where code = 'starter')
    or exists (
      select 1
      from sites s
      where s.id = sub.site_id
        and s.billing_status = 'trialing'
    )
  );
