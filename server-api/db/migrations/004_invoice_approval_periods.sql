alter table invoice_approvals
  add column if not exists period_start date,
  add column if not exists period_end date;

update invoice_approvals
set
  period_start = coalesce(period_start, approval_date),
  period_end = coalesce(period_end, approval_date)
where period_start is null or period_end is null;

alter table invoice_approvals
  alter column period_start set not null,
  alter column period_end set not null;

alter table invoice_approvals
  drop constraint if exists invoice_approvals_customer_id_key;

create unique index if not exists invoice_approvals_customer_period_unique
  on invoice_approvals (customer_id, period_start, period_end);

create index if not exists invoice_approvals_customer_period_idx
  on invoice_approvals (customer_id, period_end desc, period_start desc);
