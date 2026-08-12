-- Progressive review marks (1st / 2nd / 3rd) for reviewers.
-- Rubrics: Literature Survey, First Review PPT, Review Report, Journal Papers (max 10 each).
-- Safe to re-run (idempotent).

create table if not exists public.student_progressive_review_marks (
  id uuid primary key default gen_random_uuid(),
  team_review_id uuid not null references public.team_reviews(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  role text not null check (role in ('supervisor', 'reviewer')),
  literature_survey numeric(4,1) not null check (literature_survey >= 0 and literature_survey <= 10),
  first_review_ppt numeric(4,1) not null check (first_review_ppt >= 0 and first_review_ppt <= 10),
  review_report numeric(4,1) not null check (review_report >= 0 and review_report <= 10),
  journal_papers numeric(4,1) not null check (journal_papers >= 0 and journal_papers <= 10),
  total numeric(5,1) generated always as (
    literature_survey + first_review_ppt + review_report + journal_papers
  ) stored,
  marked_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_review_id, team_member_id, role)
);

create index if not exists student_progressive_review_marks_team_id_idx
  on public.student_progressive_review_marks(team_id);
create index if not exists student_progressive_review_marks_review_id_idx
  on public.student_progressive_review_marks(team_review_id);
create index if not exists student_progressive_review_marks_member_id_idx
  on public.student_progressive_review_marks(team_member_id);

alter table public.student_progressive_review_marks enable row level security;

create or replace function public.can_view_progressive_review_marks(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select can_view_student_review_marks(p_team_id);
$$;

create or replace function public.can_edit_progressive_review_marks(p_team_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select can_edit_student_review_marks(p_team_id, p_role);
$$;

drop policy if exists "View progressive review marks" on public.student_progressive_review_marks;
create policy "View progressive review marks"
  on public.student_progressive_review_marks for select
  to authenticated
  using (can_view_progressive_review_marks(team_id));

drop policy if exists "Insert progressive review marks" on public.student_progressive_review_marks;
create policy "Insert progressive review marks"
  on public.student_progressive_review_marks for insert
  to authenticated
  with check (
    can_edit_progressive_review_marks(team_id, role)
    and marked_by = auth.uid()
    and exists (
      select 1 from team_reviews tr
      where tr.id = team_review_id
        and tr.team_id = team_id
    )
    and exists (
      select 1 from team_members tm
      where tm.id = team_member_id
        and tm.team_id = team_id
    )
  );

drop policy if exists "Update progressive review marks" on public.student_progressive_review_marks;
create policy "Update progressive review marks"
  on public.student_progressive_review_marks for update
  to authenticated
  using (can_edit_progressive_review_marks(team_id, role))
  with check (
    can_edit_progressive_review_marks(team_id, role)
    and marked_by = auth.uid()
  );

grant select, insert, update on public.student_progressive_review_marks to authenticated;
grant execute on function public.can_view_progressive_review_marks(uuid) to authenticated;
grant execute on function public.can_edit_progressive_review_marks(uuid, text) to authenticated;

revoke execute on function public.can_view_progressive_review_marks(uuid) from anon;
revoke execute on function public.can_edit_progressive_review_marks(uuid, text) from anon;
