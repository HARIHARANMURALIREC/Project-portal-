-- Coordinator (lead teacher) sets a common review date/time for every team.
-- Supervisors still mark completion per team; they no longer schedule reviews.

alter table team_reviews
  add column if not exists schedule_group_id uuid;

create index if not exists team_reviews_schedule_group_id_idx
  on team_reviews(schedule_group_id);

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
begin
  if not is_lead_teacher() and not is_admin() then
    raise exception 'not authorized';
  end if;

  if p_review_title is null or length(trim(p_review_title)) = 0 then
    raise exception 'review title is required';
  end if;

  if p_scheduled_at is null then
    raise exception 'scheduled date/time is required';
  end if;

  insert into team_reviews (
    team_id,
    review_title,
    scheduled_at,
    remarks,
    created_by,
    schedule_group_id
  )
  select
    t.id,
    trim(p_review_title),
    p_scheduled_at,
    nullif(trim(coalesce(p_remarks, '')), ''),
    auth.uid(),
    v_group_id
  from teams t;

  get diagnostics v_count = row_count;

  return query select v_group_id, v_count;
end;
$$;

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
begin
  if not is_lead_teacher() and not is_admin() then
    raise exception 'not authorized';
  end if;

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
end;
$$;

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
begin
  if not is_lead_teacher() and not is_admin() then
    raise exception 'not authorized';
  end if;

  if p_schedule_group_id is null then
    raise exception 'schedule group is required';
  end if;

  if p_scheduled_at is null then
    raise exception 'scheduled date/time is required';
  end if;

  update team_reviews
  set
    scheduled_at = p_scheduled_at,
    remarks = coalesce(nullif(trim(coalesce(p_remarks, '')), ''), remarks),
    updated_at = now()
  where schedule_group_id = p_schedule_group_id;

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
begin
  if not is_lead_teacher() and not is_admin() then
    raise exception 'not authorized';
  end if;

  if p_schedule_group_id is null then
    raise exception 'schedule group is required';
  end if;

  delete from team_reviews
  where schedule_group_id = p_schedule_group_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function coordinator_schedule_review_for_all(text, timestamptz, text) to authenticated;
grant execute on function coordinator_list_review_schedules() to authenticated;
grant execute on function coordinator_reschedule_review(uuid, timestamptz, text) to authenticated;
grant execute on function coordinator_delete_review_schedule(uuid) to authenticated;
