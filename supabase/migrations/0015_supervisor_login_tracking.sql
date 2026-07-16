-- Track supervisor password changes and expose login status to admins.

alter table profiles
  add column if not exists password_changed_at timestamptz;

create or replace function mark_supervisor_password_changed()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set password_changed_at = now()
  where id = auth.uid()
    and role = 'teacher'
    and supervisor_name is not null;
end;
$$;

create or replace function admin_supervisor_login_status()
returns table (
  id uuid,
  full_name text,
  supervisor_name text,
  email text,
  last_sign_in_at timestamptz,
  password_changed_at timestamptz,
  has_logged_in boolean,
  password_changed boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.supervisor_name,
    u.email::text,
    u.last_sign_in_at,
    p.password_changed_at,
    (u.last_sign_in_at is not null) as has_logged_in,
    (p.password_changed_at is not null) as password_changed
  from profiles p
  join auth.users u on u.id = p.id
  where p.role = 'teacher'
    and p.supervisor_name is not null
  order by p.supervisor_name;
end;
$$;

grant execute on function mark_supervisor_password_changed() to authenticated;
grant execute on function admin_supervisor_login_status() to authenticated;
