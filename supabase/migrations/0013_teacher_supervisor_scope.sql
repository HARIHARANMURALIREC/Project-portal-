-- Per-supervisor teachers see only matching teams (0001 policies).
-- Lead teachers (profiles.supervisor_name IS NULL) still see all teams — e.g. Baburathinam.

drop policy if exists "Teachers can read all teams" on teams;
drop policy if exists "Teachers can read all team members" on team_members;

create policy "Lead teachers can read all teams"
  on teams for select
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
        and p.supervisor_name is null
    )
  );

create policy "Lead teachers can read all team members"
  on team_members for select
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
        and p.supervisor_name is null
    )
  );
