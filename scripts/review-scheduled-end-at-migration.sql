-- Allow common reviews to span two dates (Date 1 + Date 2)
-- Paste into Supabase SQL Editor and run

alter table public.team_reviews
  add column if not exists scheduled_end_at timestamptz;

drop function if exists public.coordinator_schedule_review_for_all(text, timestamptz, text);
drop function if exists public.coordinator_reschedule_review(uuid, timestamptz, text);
drop function if exists public.coordinator_list_review_schedules();

create or replace function public.coordinator_schedule_review_for_all(
  p_review_title text,
  p_scheduled_at timestamptz,
  p_remarks text default null,
  p_scheduled_end_at timestamptz default null
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

  if p_scheduled_end_at is not null and p_scheduled_end_at < p_scheduled_at then
    raise exception 'end date must be on or after start date';
  end if;

  if is_lead_teacher() or is_admin() then
    insert into team_reviews (
      team_id, review_title, scheduled_at, scheduled_end_at, remarks, created_by, schedule_group_id
    )
    select t.id, trim(p_review_title), p_scheduled_at, p_scheduled_end_at,
           nullif(trim(coalesce(p_remarks, '')), ''), auth.uid(), v_group_id
    from teams t;
  else
    v_batch_id := get_my_batch_coordinator_batch_id();
    if v_batch_id is null then
      raise exception 'no batch assigned to this coordinator';
    end if;

    insert into team_reviews (
      team_id, review_title, scheduled_at, scheduled_end_at, remarks, created_by, schedule_group_id
    )
    select t.id, trim(p_review_title), p_scheduled_at, p_scheduled_end_at,
           nullif(trim(coalesce(p_remarks, '')), ''), auth.uid(), v_group_id
    from teams t
    where t.batch_id = v_batch_id;
  end if;

  get diagnostics v_count = row_count;
  return query select v_group_id, v_count;
end;
$$;

create or replace function public.coordinator_list_review_schedules()
returns table (
  schedule_group_id uuid,
  review_title text,
  scheduled_at timestamptz,
  scheduled_end_at timestamptz,
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
      tr.scheduled_end_at,
      max(tr.remarks) as remarks,
      count(*)::bigint as teams_count,
      count(tr.completed_at)::bigint as completed_count,
      min(tr.created_at) as created_at
    from team_reviews tr
    where tr.schedule_group_id is not null
    group by tr.schedule_group_id, tr.review_title, tr.scheduled_at, tr.scheduled_end_at
    order by tr.scheduled_at asc;
  else
    v_batch_id := get_my_batch_coordinator_batch_id();
    return query
    select
      tr.schedule_group_id,
      tr.review_title,
      tr.scheduled_at,
      tr.scheduled_end_at,
      max(tr.remarks) as remarks,
      count(*)::bigint as teams_count,
      count(tr.completed_at)::bigint as completed_count,
      min(tr.created_at) as created_at
    from team_reviews tr
    join teams t on t.id = tr.team_id
    where tr.schedule_group_id is not null
      and t.batch_id = v_batch_id
    group by tr.schedule_group_id, tr.review_title, tr.scheduled_at, tr.scheduled_end_at
    order by tr.scheduled_at asc;
  end if;
end;
$$;

create or replace function public.coordinator_reschedule_review(
  p_schedule_group_id uuid,
  p_scheduled_at timestamptz,
  p_remarks text default null,
  p_scheduled_end_at timestamptz default null
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

  if p_scheduled_end_at is not null and p_scheduled_end_at < p_scheduled_at then
    raise exception 'end date must be on or after start date';
  end if;

  if is_lead_teacher() or is_admin() then
    update team_reviews
    set scheduled_at = p_scheduled_at,
        scheduled_end_at = p_scheduled_end_at,
        remarks = coalesce(nullif(trim(coalesce(p_remarks, '')), ''), remarks),
        updated_at = now()
    where schedule_group_id = p_schedule_group_id;
  else
    v_batch_id := get_my_batch_coordinator_batch_id();
    update team_reviews tr
    set scheduled_at = p_scheduled_at,
        scheduled_end_at = p_scheduled_end_at,
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

grant execute on function public.coordinator_schedule_review_for_all(text, timestamptz, text, timestamptz) to authenticated;
grant execute on function public.coordinator_list_review_schedules() to authenticated;
grant execute on function public.coordinator_reschedule_review(uuid, timestamptz, text, timestamptz) to authenticated;
