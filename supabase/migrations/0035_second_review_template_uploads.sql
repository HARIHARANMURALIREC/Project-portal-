-- Second Review template upload types (journal papers, review report, second review PPT)

alter table public.team_template_uploads
  drop constraint if exists team_template_uploads_template_type_check;

alter table public.team_template_uploads
  add constraint team_template_uploads_template_type_check
  check (
    template_type in (
      'literature_survey',
      'first_review_ppt',
      'review_report',
      'journal_papers',
      'second_journal_papers',
      'second_review_report',
      'second_review_ppt'
    )
  );

alter table public.coordinator_template_files
  drop constraint if exists coordinator_template_files_template_type_check;

alter table public.coordinator_template_files
  add constraint coordinator_template_files_template_type_check
  check (
    template_type in (
      'literature_survey',
      'first_review_ppt',
      'review_report',
      'journal_papers',
      'second_journal_papers',
      'second_review_report',
      'second_review_ppt'
    )
  );
