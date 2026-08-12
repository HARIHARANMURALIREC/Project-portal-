-- Section reviewers: Reviewer 1 (IT A & IT B) and Reviewer 2 (IT C & IT D).
-- These accounts see every team in their sections and can allot reviewer marks.
-- Safe to re-run (idempotent).

create table if not exists public.section_reviewers (
  batch_id text primary key references public.batches(id) on delete cascade,
  supervisor_name text not null
);

insert into public.section_reviewers (batch_id, supervisor_name) values
  ('A', 'Section Reviewer 1'),
  ('B', 'Section Reviewer 1'),
  ('C', 'Section Reviewer 2'),
  ('D', 'Section Reviewer 2')
on conflict (batch_id) do update
  set supervisor_name = excluded.supervisor_name;

create or replace function public.is_section_reviewer_for(p_batch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join section_reviewers sr on sr.supervisor_name = p.supervisor_name
    where p.id = auth.uid()
      and p.role = 'teacher'
      and p.supervisor_name is not null
      and sr.batch_id = p_batch_id
  );
$$;

create or replace function public.is_section_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join section_reviewers sr on sr.supervisor_name = p.supervisor_name
    where p.id = auth.uid()
      and p.role = 'teacher'
      and p.supervisor_name is not null
  );
$$;

drop policy if exists "Section reviewers can read section teams" on public.teams;
create policy "Section reviewers can read section teams"
  on public.teams for select
  to authenticated
  using (is_section_reviewer_for(batch_id));

drop policy if exists "Section reviewers can read section team members" on public.team_members;
create policy "Section reviewers can read section team members"
  on public.team_members for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = team_members.team_id
        and is_section_reviewer_for(t.batch_id)
    )
  );

create or replace function public.teacher_can_read_team_reviews(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select supervisor_can_manage_team_reviews(p_team_id)
    or exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = p_team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and p.supervisor_name = t.reviewer_name
    )
    or exists (
      select 1 from teams t
      where t.id = p_team_id
        and is_section_reviewer_for(t.batch_id)
    )
    or is_lead_teacher()
    or exists (
      select 1 from teams t
      where t.id = p_team_id
        and is_batch_coordinator_for(t.batch_id)
    );
$$;

drop policy if exists "Teachers can read team reviews" on public.team_reviews;
create policy "Teachers can read team reviews"
  on public.team_reviews for select
  to authenticated
  using (teacher_can_read_team_reviews(team_id));

create or replace function public.reviewer_can_manage_team_reviews(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_admin()
    or exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = p_team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and p.supervisor_name = t.reviewer_name
    )
    or exists (
      select 1 from teams t
      where t.id = p_team_id
        and is_section_reviewer_for(t.batch_id)
    );
$$;

drop policy if exists "Supervisors can update team reviews" on public.team_reviews;
drop policy if exists "Supervisors and Reviewers can update team reviews" on public.team_reviews;
create policy "Supervisors and Reviewers can update team reviews"
  on public.team_reviews for update
  to authenticated
  using (
    supervisor_can_manage_team_reviews(team_id)
    or reviewer_can_manage_team_reviews(team_id)
  )
  with check (
    supervisor_can_manage_team_reviews(team_id)
    or reviewer_can_manage_team_reviews(team_id)
  );

create or replace function public.can_manage_team_review_files(p_team_id uuid)
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
      where t.id = p_team_id
        and is_section_reviewer_for(t.batch_id)
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

create or replace function public.can_view_student_review_marks(p_team_id uuid)
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
      where t.id = p_team_id
        and is_section_reviewer_for(t.batch_id)
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

create or replace function public.can_edit_student_review_marks(p_team_id uuid, p_role text)
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
        or (p_role = 'reviewer' and is_section_reviewer_for(t.batch_id))
      )
  );
$$;

drop policy if exists "Section reviewers can read section attendance" on public.student_attendance;
create policy "Section reviewers can read section attendance"
  on public.student_attendance for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = student_attendance.team_id
        and is_section_reviewer_for(t.batch_id)
    )
  );

drop policy if exists "Section reviewers can insert section attendance" on public.student_attendance;
create policy "Section reviewers can insert section attendance"
  on public.student_attendance for insert
  to authenticated
  with check (
    marked_by = auth.uid()
    and exists (
      select 1 from teams t
      where t.id = student_attendance.team_id
        and is_section_reviewer_for(t.batch_id)
    )
  );

drop policy if exists "Section reviewers can update section attendance" on public.student_attendance;
create policy "Section reviewers can update section attendance"
  on public.student_attendance for update
  to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = student_attendance.team_id
        and is_section_reviewer_for(t.batch_id)
    )
  )
  with check (
    exists (
      select 1 from teams t
      where t.id = student_attendance.team_id
        and is_section_reviewer_for(t.batch_id)
    )
  );

revoke execute on function public.is_section_reviewer_for(text) from anon;
revoke execute on function public.is_section_reviewer() from anon;

grant execute on function public.is_section_reviewer_for(text) to authenticated;
grant execute on function public.is_section_reviewer() to authenticated;
grant execute on function public.teacher_can_read_team_reviews(uuid) to authenticated;
grant execute on function public.reviewer_can_manage_team_reviews(uuid) to authenticated;
grant execute on function public.can_manage_team_review_files(uuid) to authenticated;
grant execute on function public.can_view_student_review_marks(uuid) to authenticated;
grant execute on function public.can_edit_student_review_marks(uuid, text) to authenticated;
