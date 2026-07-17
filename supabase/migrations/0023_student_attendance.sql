-- Student attendance tracking
-- Supervisors and reviewers can mark attendance for students in their teams
-- Accessible only to supervisors and reviewers for their own teams

create table if not exists student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references team_members(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent')),
  marked_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create index if not exists student_attendance_student_id_idx on student_attendance(student_id);
create index if not exists student_attendance_team_id_idx on student_attendance(team_id);
create index if not exists student_attendance_date_idx on student_attendance(attendance_date);
create index if not exists student_attendance_status_idx on student_attendance(status);

alter table student_attendance enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Supervisors can read own team attendance" on student_attendance;
drop policy if exists "Supervisors can insert own team attendance" on student_attendance;
drop policy if exists "Supervisors can update own team attendance" on student_attendance;
drop policy if exists "Students can read own attendance" on student_attendance;
drop policy if exists "Coordinators can read section attendance" on student_attendance;
drop policy if exists "Admins can read all attendance" on student_attendance;

-- Supervisors and reviewers can read attendance for their own teams
create policy "Supervisors and reviewers can read own team attendance"
  on student_attendance for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = student_attendance.team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and (p.supervisor_name = t.supervisor_name or p.supervisor_name = t.reviewer_name)
    )
  );

-- Supervisors and reviewers can insert attendance for their own teams
create policy "Supervisors and reviewers can insert own team attendance"
  on student_attendance for insert
  to authenticated
  with check (
    exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = student_attendance.team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and (p.supervisor_name = t.supervisor_name or p.supervisor_name = t.reviewer_name)
    )
    and marked_by = auth.uid()
  );

-- Supervisors and reviewers can update attendance for their own teams
create policy "Supervisors and reviewers can update own team attendance"
  on student_attendance for update
  to authenticated
  using (
    exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = student_attendance.team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and (p.supervisor_name = t.supervisor_name or p.supervisor_name = t.reviewer_name)
    )
  )
  with check (
    exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = student_attendance.team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and (p.supervisor_name = t.supervisor_name or p.supervisor_name = t.reviewer_name)
    )
  );

-- Students can read their own attendance
create policy "Students can read own attendance"
  on student_attendance for select
  to authenticated
  using (student_id in (
    select id from team_members 
    where user_id = auth.uid()
  ));

-- Coordinators can read attendance for students in their section
create policy "Coordinators can read section attendance"
  on student_attendance for Select
  to authenticated
  using (
    exists (
      select 1 from teams t
      join batch_coordinators bc on bc.batch_id = t.batch_id
      join profiles p on p.supervisor_name = bc.supervisor_name
      where t.id = student_attendance.team_id
        and p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

-- Admins can read all attendance
create policy "Admins can read all attendance"
  on student_attendance for select
  to authenticated
  using (is_admin());

grant select, insert, update on student_attendance to authenticated;
