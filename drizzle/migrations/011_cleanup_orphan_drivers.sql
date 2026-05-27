-- Deactivate driver master rows that were left active after their
-- corresponding driver-role user account was soft-deleted.
-- Skips drivers that have no matching user (e.g. ad-hoc names entered via
-- dispatch form) so historical dispatch records keep resolving.

update drivers d
set is_active = false, updated_at = now()
where d.is_active = true
  and exists (
    select 1
    from site_memberships sm
    join users u on u.id = sm.user_id
    where sm.site_id = d.site_id
      and sm.role = 'driver'
      and sm.is_active = false
      and u.display_name = d.name
  )
  and not exists (
    select 1
    from site_memberships sm2
    join users u2 on u2.id = sm2.user_id
    where sm2.site_id = d.site_id
      and sm2.role = 'driver'
      and sm2.is_active = true
      and u2.is_active = true
      and u2.display_name = d.name
  );
