-- Reviewer allotment on teams + per-student Zeroth Review marks (supervisor vs reviewer).

alter table teams
  add column if not exists reviewer_name text;

create index if not exists teams_reviewer_name_idx on teams(reviewer_name);

-- Reviewers can read teams they are allotted to review.
drop policy if exists "Teachers can read reviewed teams" on teams;
create policy "Teachers can read reviewed teams"
  on teams for select
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and p.supervisor_name = teams.reviewer_name
    )
  );

drop policy if exists "Teachers can read members of reviewed teams" on team_members;
create policy "Teachers can read members of reviewed teams"
  on team_members for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = team_members.team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and p.supervisor_name = t.reviewer_name
    )
  );

-- Allow reviewers (and keep supervisors / lead / batch) to read team reviews.
create or replace function teacher_can_read_team_reviews(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    supervisor_can_manage_team_reviews(p_team_id)
    or is_lead_teacher()
    or exists (
      select 1 from teams t
      where t.id = p_team_id
        and is_batch_coordinator_for(t.batch_id)
    )
    or exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = p_team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and p.supervisor_name = t.reviewer_name
    );
$$;

-- Reviewers can read review file metadata for allotted teams.
create or replace function can_manage_team_review_files(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    is_admin()
    or is_lead_teacher()
    or exists (
      select 1 from teams t
      where t.id = p_team_id
        and is_batch_coordinator_for(t.batch_id)
    )
    or exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = p_team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and (
          p.supervisor_name = t.supervisor_name
          or p.supervisor_name = t.reviewer_name
        )
    )
    or p_team_id = get_my_team_id();
$$;

-- Per-student marks (supervisor and reviewer separately).
create table if not exists student_review_marks (
  id uuid primary key default gen_random_uuid(),
  team_review_id uuid not null references team_reviews(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  team_member_id uuid not null references team_members(id) on delete cascade,
  role text not null check (role in ('supervisor', 'reviewer')),
  novelty_idea numeric(4,1) not null check (novelty_idea >= 0 and novelty_idea <= 10),
  abstract_content numeric(4,1) not null check (abstract_content >= 0 and abstract_content <= 5),
  sdg_goal_mapping numeric(4,1) not null check (sdg_goal_mapping >= 0 and sdg_goal_mapping <= 10),
  total numeric(5,1) generated always as (novelty_idea + abstract_content + sdg_goal_mapping) stored,
  marked_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_review_id, team_member_id, role)
);

create index if not exists student_review_marks_team_id_idx on student_review_marks(team_id);
create index if not exists student_review_marks_review_id_idx on student_review_marks(team_review_id);
create index if not exists student_review_marks_member_id_idx on student_review_marks(team_member_id);

create or replace function can_view_student_review_marks(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    is_admin()
    or is_lead_teacher()
    or exists (
      select 1 from teams t
      where t.id = p_team_id
        and is_batch_coordinator_for(t.batch_id)
    )
    or exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = p_team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and (
          p.supervisor_name = t.supervisor_name
          or p.supervisor_name = t.reviewer_name
        )
    );
$$;

create or replace function can_edit_student_review_marks(p_team_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from teams t
    join profiles p on p.id = auth.uid()
    where t.id = p_team_id
      and p.role = 'teacher'
      and p.supervisor_name is not null
      and (
        (p_role = 'supervisor' and p.supervisor_name = t.supervisor_name)
        or (p_role = 'reviewer' and p.supervisor_name = t.reviewer_name)
      )
  );
$$;

alter table student_review_marks enable row level security;

drop policy if exists "Teachers can view student review marks" on student_review_marks;
drop policy if exists "Teachers can insert student review marks" on student_review_marks;
drop policy if exists "Teachers can update student review marks" on student_review_marks;

create policy "Teachers can view student review marks"
  on student_review_marks for select
  to authenticated
  using (can_view_student_review_marks(team_id));

create policy "Teachers can insert student review marks"
  on student_review_marks for insert
  to authenticated
  with check (
    can_edit_student_review_marks(team_id, role)
    and marked_by = auth.uid()
    and exists (
      select 1 from team_reviews tr
      where tr.id = team_review_id
        and tr.team_id = team_id
        and tr.review_title = 'Zeroth Review'
    )
    and exists (
      select 1 from team_members tm
      where tm.id = team_member_id
        and tm.team_id = team_id
    )
  );

create policy "Teachers can update student review marks"
  on student_review_marks for update
  to authenticated
  using (can_edit_student_review_marks(team_id, role))
  with check (
    can_edit_student_review_marks(team_id, role)
    and marked_by = auth.uid()
  );

grant select, insert, update on student_review_marks to authenticated;
grant execute on function can_view_student_review_marks(uuid) to authenticated;
grant execute on function can_edit_student_review_marks(uuid, text) to authenticated;

-- Replace team-level marks table (test data only).
drop policy if exists "Teachers can view team review marks" on team_review_marks;
drop policy if exists "Supervisors can insert team review marks" on team_review_marks;
drop policy if exists "Supervisors can update team review marks" on team_review_marks;
drop table if exists team_review_marks;
drop function if exists can_view_team_review_marks(uuid);
drop function if exists can_edit_team_review_marks(uuid);
