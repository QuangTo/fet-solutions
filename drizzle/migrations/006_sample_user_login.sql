update users
set phone = '0900000000',
    password_hash = encode(digest('0900000000', 'sha256'), 'hex'),
    updated_at = now()
where display_name = 'Admin mẫu'
  and phone is null
  and not exists (select 1 from users existing where existing.phone = '0900000000');

update users
set phone = '0900000001',
    password_hash = encode(digest('0900000001', 'sha256'), 'hex'),
    updated_at = now()
where display_name = 'Thủ kho mẫu'
  and phone is null
  and not exists (select 1 from users existing where existing.phone = '0900000001');

update users
set phone = '0900000002',
    password_hash = encode(digest('0900000002', 'sha256'), 'hex'),
    updated_at = now()
where display_name = 'Kế toán mẫu'
  and phone is null
  and not exists (select 1 from users existing where existing.phone = '0900000002');

update users
set phone = '0900000003',
    password_hash = encode(digest('0900000003', 'sha256'), 'hex'),
    updated_at = now()
where display_name = 'Tài xế mẫu'
  and phone is null
  and not exists (select 1 from users existing where existing.phone = '0900000003');
