-- Zeroth Review rubrics / marks (supervisor enters; coordinators view; students cannot see).

create table if not exists team_review_marks (
  id uuid primary key default gen_random_uuid(),
  team_review_id uuid not null unique references team_reviews(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  novelty_idea numeric(4,1) not null check (novelty_idea >= 0 and novelty_idea <= 10),
  abstract_content numeric(4,1) not null check (abstract_content >= 0 and abstract_content <= 5),
  sdg_goal_mapping numeric(4,1) not null check (sdg_goal_mapping >= 0 and sdg_goal_mapping <= 10),
  total numeric(5,1) generated always as (novelty_idea + abstract_content + sdg_goal_mapping) stored,
  marked_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_review_marks_team_id_idx on team_review_marks(team_id);
create index if not exists team_review_marks_review_id_idx on team_review_marks(team_review_id);

create or replace function can_view_team_review_marks(p_team_id uuid)
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
    );
$$;

create or replace function can_edit_team_review_marks(p_team_id uuid)
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
      and p.supervisor_name = t.supervisor_name
  );
$$;

alter table team_review_marks enable row level security;

drop policy if exists "Teachers can view team review marks" on team_review_marks;
drop policy if exists "Supervisors can insert team review marks" on team_review_marks;
drop policy if exists "Supervisors can update team review marks" on team_review_marks;

create policy "Teachers can view team review marks"
  on team_review_marks for select
  to authenticated
  using (can_view_team_review_marks(team_id));

create policy "Supervisors can insert team review marks"
  on team_review_marks for insert
  to authenticated
  with check (
    can_edit_team_review_marks(team_id)
    and marked_by = auth.uid()
    and exists (
      select 1 from team_reviews tr
      where tr.id = team_review_id
        and tr.team_id = team_id
        and tr.review_title = 'Zeroth Review'
    )
  );

create policy "Supervisors can update team review marks"
  on team_review_marks for update
  to authenticated
  using (can_edit_team_review_marks(team_id))
  with check (
    can_edit_team_review_marks(team_id)
    and marked_by = auth.uid()
  );

grant select, insert, update on team_review_marks to authenticated;
grant execute on function can_view_team_review_marks(uuid) to authenticated;
grant execute on function can_edit_team_review_marks(uuid) to authenticated;
