-- Team review schedule & completion (supervisors assign; students read own team).

create table if not exists team_reviews (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  review_title text not null,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  remarks text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_reviews_team_id_idx on team_reviews(team_id);
create index if not exists team_reviews_scheduled_at_idx on team_reviews(scheduled_at);

create or replace function is_lead_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
      and p.supervisor_name is null
  );
$$;

create or replace function supervisor_can_manage_team_reviews(p_team_id uuid)
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
        and p.supervisor_name = t.supervisor_name
    );
$$;

create or replace function teacher_can_read_team_reviews(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select supervisor_can_manage_team_reviews(p_team_id)
    or is_lead_teacher();
$$;

alter table team_reviews enable row level security;

create policy "Students can read own team reviews"
  on team_reviews for select
  to authenticated
  using (team_id = get_my_team_id());

create policy "Teachers can read team reviews"
  on team_reviews for select
  to authenticated
  using (teacher_can_read_team_reviews(team_id));

create policy "Supervisors can create team reviews"
  on team_reviews for insert
  to authenticated
  with check (
    supervisor_can_manage_team_reviews(team_id)
    and created_by = auth.uid()
  );

create policy "Supervisors can update team reviews"
  on team_reviews for update
  to authenticated
  using (supervisor_can_manage_team_reviews(team_id))
  with check (supervisor_can_manage_team_reviews(team_id));

create policy "Admins can manage team reviews"
  on team_reviews for all
  to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update on team_reviews to authenticated;
grant execute on function is_lead_teacher() to authenticated;
grant execute on function supervisor_can_manage_team_reviews(uuid) to authenticated;
grant execute on function teacher_can_read_team_reviews(uuid) to authenticated;
