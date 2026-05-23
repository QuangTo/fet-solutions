alter table invoice_approvals
  add column if not exists period_closed_at timestamptz;

update invoice_approvals
set period_closed_at = coalesce(period_closed_at, created_at)
where period_closed_at is null;

alter table invoice_approvals
  alter column period_closed_at set not null;

drop index if exists invoice_approvals_customer_period_unique;

create unique index if not exists invoice_approvals_customer_period_closed_unique
  on invoice_approvals (customer_id, period_closed_at);

create index if not exists invoice_approvals_customer_closed_idx
  on invoice_approvals (customer_id, period_closed_at desc);
