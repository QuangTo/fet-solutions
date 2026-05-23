alter table users
  add column if not exists phone text,
  add column if not exists password_hash text;

create unique index if not exists users_phone_unique
  on users (phone)
  where phone is not null;

create index if not exists users_role_active_idx
  on users (role, is_active);

create index if not exists receipts_customer_date_idx
  on receipts (customer_id, received_date desc, created_at desc);

create index if not exists receipt_items_receipt_sku_idx
  on receipt_items (receipt_id, sku);

create index if not exists dispatches_customer_date_idx
  on dispatches (customer_id, dispatch_date desc, created_at desc);

create index if not exists dispatch_items_dispatch_sku_idx
  on dispatch_items (dispatch_id, sku);

create index if not exists invoice_approvals_customer_date_idx
  on invoice_approvals (customer_id, approval_date desc, created_at desc);
