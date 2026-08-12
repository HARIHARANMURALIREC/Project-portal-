-- Progressive review marks rubrics v2 (1st / 2nd / 3rd).
-- Feasibility, Proposed Methodology, Background, Literature Survey, Reference Paper (max 10 each).
-- Safe to re-run (idempotent). Run this if you already applied the earlier progressive marks migration.

alter table public.student_progressive_review_marks
  drop column if exists total;

alter table public.student_progressive_review_marks
  add column if not exists feasibility numeric(4,1),
  add column if not exists proposed_methodology numeric(4,1),
  add column if not exists background numeric(4,1),
  add column if not exists reference_paper numeric(4,1);

-- Keep literature_survey if present; ensure it exists for fresh paths.
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
