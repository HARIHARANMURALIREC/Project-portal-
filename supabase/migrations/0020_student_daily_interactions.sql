-- Student daily interactions with supervisor
-- Students can log their daily interactions with their supervisor
-- Accessible only to the student and their respective coordinator (by section)

create table if not exists student_daily_interactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references team_members(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  interaction_date date not null,
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, interaction_date)
);

create index if not exists student_daily_interactions_student_id_idx on student_daily_interactions(student_id);
create index if not exists student_daily_interactions_team_id_idx on student_daily_interactions(team_id);
create index if not exists student_daily_interactions_date_idx on student_daily_interactions(interaction_date);

alter table student_daily_interactions enable row level security;

-- Students can read/write their own interactions
create policy "Students can read own interactions"
  on student_daily_interactions for select
  to authenticated
  using (student_id in (
    select id from team_members 
    where user_id = auth.uid()
  ));

create policy "Students can insert own interactions"
  on student_daily_interactions for insert
  to authenticated
  with check (
    student_id in (
      select id from team_members 
      where user_id = auth.uid()
    )
    and team_id = get_my_team_id()
  );

create policy "Students can update own interactions"
  on student_daily_interactions for update
  to authenticated
  using (
    student_id in (
      select id from team_members 
      where user_id = auth.uid()
    )
  )
  with check (
    student_id in (
      select id from team_members 
      where user_id = auth.uid()
    )
  );

-- Coordinators can read interactions for students in their section
create policy "Coordinators can read section interactions"
  on student_daily_interactions for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      join batch_coordinators bc on bc.batch_id = t.batch_id
      join profiles p on p.supervisor_name = bc.supervisor_name
      where t.id = student_daily_interactions.team_id
        and p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

-- Admins can read all interactions
create policy "Admins can read all interactions"
  on student_daily_interactions for select
  to authenticated
  using (is_admin());

grant select, insert, update on student_daily_interactions to authenticated;
