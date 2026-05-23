drop index if exists users_phone_unique;

create unique index if not exists users_phone_unique
  on users (phone);
