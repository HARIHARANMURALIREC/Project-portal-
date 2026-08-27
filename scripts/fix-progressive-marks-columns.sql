-- FIX: "Could not find the 'background' column of 'student_progressive_review_marks'"
-- Run this once in Supabase → SQL Editor → New query → Paste → Run
-- Safe to re-run (idempotent).

-- 1) Replace old rubrics (first_review_ppt / review_report / journal_papers)
--    with: Feasibility, Proposed Methodology, Background, Literature Survey, Reference Paper

alter table public.student_progressive_review_marks
  drop column if exists total;

alter table public.student_progressive_review_marks
  add column if not exists feasibility numeric(4,1),
  add column if not exists proposed_methodology numeric(4,1),
  add column if not exists background numeric(4,1),
  add column if not exists reference_paper numeric(4,1);

alter table public.student_progressive_review_marks
  add column if not exists literature_survey numeric(4,1);

update public.student_progressive_review_marks
set
  feasibility = coalesce(feasibility, 0),
  proposed_methodology = coalesce(proposed_methodology, 0),
  background = coalesce(background, 0),
  literature_survey = coalesce(literature_survey, 0),
  reference_paper = coalesce(reference_paper, 0)
where true;

alter table public.student_progressive_review_marks
  alter column feasibility set not null,
  alter column proposed_methodology set not null,
  alter column background set not null,
  alter column literature_survey set not null,
  alter column reference_paper set not null;

alter table public.student_progressive_review_marks
  drop column if exists first_review_ppt,
  drop column if exists review_report,
  drop column if exists journal_papers;

alter table public.student_progressive_review_marks
  drop constraint if exists student_progressive_review_marks_feasibility_check,
  drop constraint if exists student_progressive_review_marks_proposed_methodology_check,
  drop constraint if exists student_progressive_review_marks_background_check,
  drop constraint if exists student_progressive_review_marks_literature_survey_check,
  drop constraint if exists student_progressive_review_marks_reference_paper_check;

alter table public.student_progressive_review_marks
  add constraint student_progressive_review_marks_feasibility_check
    check (feasibility >= 0 and feasibility <= 10),
  add constraint student_progressive_review_marks_proposed_methodology_check
    check (proposed_methodology >= 0 and proposed_methodology <= 10),
  add constraint student_progressive_review_marks_background_check
    check (background >= 0 and background <= 10),
  add constraint student_progressive_review_marks_literature_survey_check
    check (literature_survey >= 0 and literature_survey <= 10),
  add constraint student_progressive_review_marks_reference_paper_check
    check (reference_paper >= 0 and reference_paper <= 10);

alter table public.student_progressive_review_marks
  add column total numeric(5,1) generated always as (
    feasibility + proposed_methodology + background + literature_survey + reference_paper
  ) stored;

-- 2) Allow internal/external reviewer roles (and keep legacy reviewer)

alter table public.student_review_marks
  drop constraint if exists student_review_marks_role_check;

alter table public.student_review_marks
  add constraint student_review_marks_role_check
  check (role in ('supervisor', 'reviewer', 'internal_reviewer', 'external_reviewer'));

alter table public.student_progressive_review_marks
  drop constraint if exists student_progressive_review_marks_role_check;

alter table public.student_progressive_review_marks
  add constraint student_progressive_review_marks_role_check
  check (role in ('supervisor', 'reviewer', 'internal_reviewer', 'external_reviewer'));

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
        or (
          p_role in ('reviewer', 'internal_reviewer', 'external_reviewer')
          and p.supervisor_name = t.reviewer_name
        )
        or (
          p_role in ('reviewer', 'external_reviewer')
          and p.supervisor_name in ('Section Reviewer 1', 'Section Reviewer 2')
        )
      )
  );
$$;

grant execute on function public.can_edit_student_review_marks(uuid, text) to authenticated;
revoke execute on function public.can_edit_student_review_marks(uuid, text) from anon;

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
