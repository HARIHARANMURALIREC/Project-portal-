-- Single teacher account sees all teams (not only matched supervisor_name)
create policy "Teachers can read all teams"
  on teams for select
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );

create policy "Teachers can read all team members"
  on team_members for select
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );
