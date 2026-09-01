-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Storage bucket for all template files
insert into storage.buckets (id, name, public)
values ('template-submissions', 'template-submissions', false)
on conflict (id) do nothing;

-- 2. Storage RLS policies
create policy "Authenticated upload template submissions"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'template-submissions');

create policy "Authenticated read template submissions"
  on storage.objects for select to authenticated
  using (bucket_id = 'template-submissions');

create policy "Authenticated delete template submissions"
  on storage.objects for delete to authenticated
  using (bucket_id = 'template-submissions');

-- 3. Coordinator demo files (coordinator uploads these; students download)
create table if not exists public.coordinator_template_files (
  id           uuid primary key default gen_random_uuid(),
  template_type text not null unique,
  storage_path      text not null,
  original_filename text not null,
  uploaded_by  uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.coordinator_template_files enable row level security;
create policy "All auth read coordinator templates"
  on public.coordinator_template_files for select to authenticated using (true);
create policy "All auth manage coordinator templates"
  on public.coordinator_template_files for all to authenticated using (true) with check (true);

-- 4. Student team submissions (students upload; supervisor/reviewer/coordinator see)
create table if not exists public.team_template_uploads (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  template_type text not null,
  storage_path      text not null,
  original_filename text not null,
  uploaded_by  uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (team_id, template_type)
);

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
alter table public.team_template_uploads enable row level security;
create policy "All auth read team template uploads"
  on public.team_template_uploads for select to authenticated using (true);
create policy "All auth manage team template uploads"
  on public.team_template_uploads for all to authenticated using (true) with check (true);

-- 5. Batch coordinators: read all team codes for portal-wide template/upload lists
-- (uploads are visible to all auth users; team rows were section-scoped only)
drop policy if exists "Batch coordinators can read all teams for portal" on public.teams;
create policy "Batch coordinators can read all teams for portal"
  on public.teams for select
  to authenticated
  using (public.is_batch_coordinator());
