-- Supervisor instructions for their team members
-- Supervisors can add instructions with title, date, time, and notes for their teams

create table if not exists supervisor_instructions (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references profiles(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  instruction_title text not null,
  scheduled_at timestamptz not null,
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supervisor_instructions_supervisor_id_idx on supervisor_instructions(supervisor_id);
create index if not exists supervisor_instructions_team_id_idx on supervisor_instructions(team_id);
create index if not exists supervisor_instructions_scheduled_at_idx on supervisor_instructions(scheduled_at);

alter table supervisor_instructions enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Supervisors can read own instructions" on supervisor_instructions;
drop policy if exists "Supervisors can insert own instructions" on supervisor_instructions;
drop policy if exists "Supervisors can update own instructions" on supervisor_instructions;
drop policy if exists "Supervisors can delete own instructions" on supervisor_instructions;
drop policy if exists "Students can read supervisor instructions" on supervisor_instructions;
drop policy if exists "Coordinators can read section supervisor instructions" on supervisor_instructions;
drop policy if exists "Admins can read all supervisor instructions" on supervisor_instructions;

-- Supervisors can read/write their own instructions
create policy "Supervisors can read own instructions"
  on supervisor_instructions for select
  to authenticated
  using (
    supervisor_id = auth.uid()
    and team_id in (
      select id from teams 
      where supervisor_name = (
        select supervisor_name from profiles 
        where id = auth.uid()
      )
    )
  );

create policy "Supervisors can insert own instructions"
  on supervisor_instructions for insert
  to authenticated
  with check (
    supervisor_id = auth.uid()
    and team_id in (
      select id from teams 
      where supervisor_name = (
        select supervisor_name from profiles 
        where id = auth.uid()
      )
    )
  );

create policy "Supervisors can update own instructions"
  on supervisor_instructions for update
  to authenticated
  using (supervisor_id = auth.uid())
  with check (supervisor_id = auth.uid());

create policy "Supervisors can delete own instructions"
  on supervisor_instructions for delete
  to authenticated
  using (supervisor_id = auth.uid());

-- Students can read instructions from their supervisor
create policy "Students can read supervisor instructions"
  on supervisor_instructions for select
  to authenticated
  using (
    team_id = get_my_team_id()
  );

-- Coordinators can read instructions for students in their section
create policy "Coordinators can read section supervisor instructions"
  on supervisor_instructions for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      join batch_coordinators bc on bc.batch_id = t.batch_id
      join profiles p on p.supervisor_name = bc.supervisor_name
      where t.id = supervisor_instructions.team_id
        and p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

-- Admins can read all instructions
create policy "Admins can read all supervisor instructions"
  on supervisor_instructions for select
  to authenticated
  using (is_admin());

grant select, insert, update, delete on supervisor_instructions to authenticated;
