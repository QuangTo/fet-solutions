update users
set is_platform_admin = false,
    updated_at = now()
where phone = '123456789';

update users
set is_platform_admin = true,
    updated_at = now()
where phone = 'quangto';
