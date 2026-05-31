alter table sites add column if not exists public_slug text;

update sites s
set public_slug = case
  when o.slug = 'default' and s.code = 'default' then 'demo'
  else lower(regexp_replace(s.code, '[^a-zA-Z0-9]+', '-', 'g'))
end
from organizations o
where o.id = s.organization_id
  and s.public_slug is null;

alter table sites alter column public_slug set not null;

create unique index if not exists sites_public_slug_unique on sites (public_slug);
create index if not exists sites_public_slug_status_idx on sites (public_slug, status);
