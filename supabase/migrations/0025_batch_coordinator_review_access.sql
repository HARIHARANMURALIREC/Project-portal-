-- Allow batch coordinators to schedule, read, and manage reviews for their section.
-- Fixes:
--   1. coordinator_schedule_review_for_all — allow batch coordinators to schedule for their section
--   2. coordinator_list_review_schedules  — allow batch coordinators to list schedules for their section
--   3. teacher_can_read_team_reviews      — include batch coordinator check
--   4. can_manage_team_review_files       — include batch coordinator check for file access

-- =============================================================================
-- 1. Allow batch coordinators to schedule reviews for their own section only
-- =============================================================================

create or replace function coordinator_schedule_review_for_all(
  p_review_title text,
  p_scheduled_at timestamptz,
  p_remarks text default null
)
returns table (
  schedule_group_id uuid,
  teams_scheduled integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid := gen_random_uuid();
  v_count integer := 0;
  v_batch_id text;
begin
  if not is_lead_teacher() and not is_admin() and not is_batch_coordinator() then
    raise exception 'not authorized';
  end if;

  if p_review_title is null or length(trim(p_review_title)) = 0 then
    raise exception 'review title is required';
  end if;

  if p_scheduled_at is null then
    raise exception 'scheduled date/time is required';
  end if;

  -- Lead teacher / admin schedules for ALL teams; batch coordinator schedules for their section only
  if is_lead_teacher() or is_admin() then
    insert into team_reviews (
      team_id, review_title, scheduled_at, remarks, created_by, schedule_group_id
    )
    select t.id, trim(p_review_title), p_scheduled_at,
           nullif(trim(coalesce(p_remarks, '')), ''), auth.uid(), v_group_id
    from teams t;
  else
    v_batch_id := get_my_batch_coordinator_batch_id();
    if v_batch_id is null then
      raise exception 'no batch assigned to this coordinator';
    end if;

    insert into team_reviews (
      team_id, review_title, scheduled_at, remarks, created_by, schedule_group_id
    )
    select t.id, trim(p_review_title), p_scheduled_at,
           nullif(trim(coalesce(p_remarks, '')), ''), auth.uid(), v_group_id
    from teams t
    where t.batch_id = v_batch_id;
  end if;

  get diagnostics v_count = row_count;
  return query select v_group_id, v_count;
end;
$$;

-- =============================================================================
-- 2. Allow batch coordinators to list their section's review schedules
-- =============================================================================

create or replace function coordinator_list_review_schedules()
returns table (
  schedule_group_id uuid,
  review_title text,
  scheduled_at timestamptz,
  remarks text,
  teams_count bigint,
  completed_count bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id text;
begin
  if not is_lead_teacher() and not is_admin() and not is_batch_coordinator() then
    raise exception 'not authorized';
  end if;

  if is_lead_teacher() or is_admin() then
    return query
    select
      tr.schedule_group_id,
      tr.review_title,
      tr.scheduled_at,
      max(tr.remarks) as remarks,
      count(*)::bigint as teams_count,
      count(tr.completed_at)::bigint as completed_count,
      min(tr.created_at) as created_at
    from team_reviews tr
    where tr.schedule_group_id is not null
    group by tr.schedule_group_id, tr.review_title, tr.scheduled_at
    order by tr.scheduled_at asc;
  else
    v_batch_id := get_my_batch_coordinator_batch_id();
    return query
    select
      tr.schedule_group_id,
      tr.review_title,
      tr.scheduled_at,
      max(tr.remarks) as remarks,
      count(*)::bigint as teams_count,
      count(tr.completed_at)::bigint as completed_count,
      min(tr.created_at) as created_at
    from team_reviews tr
    join teams t on t.id = tr.team_id
    where tr.schedule_group_id is not null
      and t.batch_id = v_batch_id
    group by tr.schedule_group_id, tr.review_title, tr.scheduled_at
    order by tr.scheduled_at asc;
  end if;
end;
$$;

-- =============================================================================
-- 3. Allow batch coordinators to reschedule and delete their section's reviews
-- =============================================================================

create or replace function coordinator_reschedule_review(
  p_schedule_group_id uuid,
  p_scheduled_at timestamptz,
  p_remarks text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_batch_id text;
begin
  if not is_lead_teacher() and not is_admin() and not is_batch_coordinator() then
    raise exception 'not authorized';
  end if;

  if p_schedule_group_id is null then
    raise exception 'schedule group is required';
  end if;

  if p_scheduled_at is null then
    raise exception 'scheduled date/time is required';
  end if;

  if is_lead_teacher() or is_admin() then
    update team_reviews
    set scheduled_at = p_scheduled_at,
        remarks = coalesce(nullif(trim(coalesce(p_remarks, '')), ''), remarks),
        updated_at = now()
    where schedule_group_id = p_schedule_group_id;
  else
    v_batch_id := get_my_batch_coordinator_batch_id();
    update team_reviews tr
    set scheduled_at = p_scheduled_at,
        remarks = coalesce(nullif(trim(coalesce(p_remarks, '')), ''), remarks),
        updated_at = now()
    from teams t
    where tr.schedule_group_id = p_schedule_group_id
      and t.id = tr.team_id
      and t.batch_id = v_batch_id;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function coordinator_delete_review_schedule(p_schedule_group_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_batch_id text;
begin
  if not is_lead_teacher() and not is_admin() and not is_batch_coordinator() then
    raise exception 'not authorized';
  end if;

  if p_schedule_group_id is null then
    raise exception 'schedule group is required';
  end if;

  if is_lead_teacher() or is_admin() then
    delete from team_reviews
    where schedule_group_id = p_schedule_group_id;
  else
    v_batch_id := get_my_batch_coordinator_batch_id();
    delete from team_reviews tr
    using teams t
    where tr.schedule_group_id = p_schedule_group_id
      and t.id = tr.team_id
      and t.batch_id = v_batch_id;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =============================================================================
-- 4. Include batch coordinators in team_reviews read access
-- =============================================================================

create or replace function teacher_can_read_team_reviews(p_team_id uuid)
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
    or is_lead_teacher()
    or exists (
      select 1 from teams t
      where t.id = p_team_id
        and is_batch_coordinator_for(t.batch_id)
    );
$$;

-- Re-create the select policy to pick up the updated function
drop policy if exists "Teachers can read team reviews" on team_reviews;

create policy "Teachers can read team reviews"
  on team_reviews for select
  to authenticated
  using (teacher_can_read_team_reviews(team_id));

-- =============================================================================
-- 5. Include batch coordinators in team_review_files read/write access
-- =============================================================================

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
        and p.supervisor_name = t.supervisor_name
    )
    or p_team_id = get_my_team_id();
$$;

-- Re-grant execute so the updated definition takes effect
grant execute on function teacher_can_read_team_reviews(uuid) to authenticated;
grant execute on function can_manage_team_review_files(uuid) to authenticated;
grant execute on function coordinator_schedule_review_for_all(text, timestamptz, text) to authenticated;
grant execute on function coordinator_list_review_schedules() to authenticated;
grant execute on function coordinator_reschedule_review(uuid, timestamptz, text) to authenticated;
grant execute on function coordinator_delete_review_schedule(uuid) to authenticated;
