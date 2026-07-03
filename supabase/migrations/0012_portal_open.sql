-- Portal open/close: when false, students cannot access the portal (admin/teacher unaffected)
alter table portal_settings
  add column if not exists portal_open boolean not null default true;

-- Public read for login page (anon) and student route guards
create or replace function get_portal_status()
returns table(portal_open boolean)
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select ps.portal_open from portal_settings ps where ps.id = 1),
    true
  );
$$;

revoke all on function get_portal_status() from public;
grant execute on function get_portal_status() to anon, authenticated;
