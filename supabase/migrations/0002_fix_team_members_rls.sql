-- Fix infinite recursion in team_members RLS (self-referential policy)

create or replace function get_my_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from team_members where user_id = auth.uid() limit 1;
$$;

grant execute on function get_my_team_id() to authenticated;

drop policy if exists "Students can read own team members" on team_members;

create policy "Students can read own team member row"
  on team_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "Students can read teammates"
  on team_members for select
  to authenticated
  using (team_id = get_my_team_id());

drop policy if exists "Students can read own team" on teams;

create policy "Students can read own team"
  on teams for select
  to authenticated
  using (id = get_my_team_id());
