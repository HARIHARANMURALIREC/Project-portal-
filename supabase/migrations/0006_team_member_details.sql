-- Optional member detail fields + student update policy
alter table team_members add column if not exists department text;
alter table team_members add column if not exists year text;
alter table team_members add column if not exists semester text;
alter table team_members add column if not exists section text;

create policy "Students can update teammates"
  on team_members for update
  to authenticated
  using (team_id = get_my_team_id())
  with check (team_id = get_my_team_id());

grant update on team_members to authenticated;
