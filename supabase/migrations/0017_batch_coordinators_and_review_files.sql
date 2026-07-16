-- Batch coordinators (section leads) + review file submissions.

-- =============================================================================
-- Batch coordinator mapping (matches profiles.supervisor_name)
-- =============================================================================

create table if not exists batch_coordinators (
  batch_id text primary key references batches(id) on delete cascade,
  supervisor_name text not null unique
);

insert into batch_coordinators (batch_id, supervisor_name) values
  ('A', 'Dr.M.Babu'),
  ('B', 'Dr.P.Neelaveni'),
  ('C', 'Dr.S.Nalini'),
  ('D', 'Mr.R.Vinoth kumar')
on conflict (batch_id) do update
  set supervisor_name = excluded.supervisor_name;

create or replace function is_batch_coordinator_for(p_batch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join batch_coordinators bc on bc.supervisor_name = p.supervisor_name
    where p.id = auth.uid()
      and p.role = 'teacher'
      and p.supervisor_name is not null
      and bc.batch_id = p_batch_id
  );
$$;

create or replace function is_batch_coordinator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join batch_coordinators bc on bc.supervisor_name = p.supervisor_name
    where p.id = auth.uid()
      and p.role = 'teacher'
      and p.supervisor_name is not null
  );
$$;

create or replace function get_my_batch_coordinator_batch_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select bc.batch_id
  from profiles p
  join batch_coordinators bc on bc.supervisor_name = p.supervisor_name
  where p.id = auth.uid()
    and p.role = 'teacher'
    and p.supervisor_name is not null
  limit 1;
$$;

-- Batch coordinators can read all teams in their section
drop policy if exists "Batch coordinators can read section teams" on teams;
drop policy if exists "Batch coordinators can read section team members" on team_members;
drop policy if exists "Batch coordinators can read section team reviews" on team_reviews;

create policy "Batch coordinators can read section teams"
  on teams for select
  to authenticated
  using (is_batch_coordinator_for(batch_id));

create policy "Batch coordinators can read section team members"
  on team_members for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = team_members.team_id
        and is_batch_coordinator_for(t.batch_id)
    )
  );

-- Batch coordinators can read team reviews in their section
create policy "Batch coordinators can read section team reviews"
  on team_reviews for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = team_reviews.team_id
        and is_batch_coordinator_for(t.batch_id)
    )
  );

-- =============================================================================
-- Review file submissions
-- =============================================================================

create table if not exists team_review_files (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  team_review_id uuid not null references team_reviews(id) on delete cascade,
  file_type text not null check (file_type in ('pdf', 'ppt')),
  storage_path text not null,
  original_filename text not null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_review_id, file_type)
);

create index if not exists team_review_files_team_id_idx on team_review_files(team_id);
create index if not exists team_review_files_review_id_idx on team_review_files(team_review_id);

alter table team_review_files enable row level security;

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

create policy "Students can read own team review files"
  on team_review_files for select
  to authenticated
  using (team_id = get_my_team_id());

create policy "Teachers and coordinators can read review files"
  on team_review_files for select
  to authenticated
  using (can_manage_team_review_files(team_id));

create policy "Students can insert own team review files"
  on team_review_files for insert
  to authenticated
  with check (
    team_id = get_my_team_id()
    and uploaded_by = auth.uid()
    and exists (
      select 1 from team_reviews tr
      where tr.id = team_review_id
        and tr.team_id = team_id
    )
  );

create policy "Students can update own team review files"
  on team_review_files for update
  to authenticated
  using (team_id = get_my_team_id())
  with check (
    team_id = get_my_team_id()
    and uploaded_by = auth.uid()
  );

create policy "Students can delete own team review files"
  on team_review_files for delete
  to authenticated
  using (team_id = get_my_team_id());

grant select, insert, update, delete on team_review_files to authenticated;
grant select on batch_coordinators to authenticated;

grant execute on function is_batch_coordinator_for(text) to authenticated;
grant execute on function is_batch_coordinator() to authenticated;
grant execute on function get_my_batch_coordinator_batch_id() to authenticated;
grant execute on function can_manage_team_review_files(uuid) to authenticated;

-- Storage bucket for review submissions (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-submissions',
  'review-submissions',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: path format team/{team_id}/review/{review_id}/{filename}
drop policy if exists "Students can upload review submissions" on storage.objects;
drop policy if exists "Students can update own review submissions" on storage.objects;
drop policy if exists "Students can delete own review submissions" on storage.objects;
drop policy if exists "Students can read own review submissions" on storage.objects;
drop policy if exists "Teachers can read review submissions for accessible teams" on storage.objects;

create policy "Students can upload review submissions"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-submissions'
    and (storage.foldername(name))[1] = 'team'
    and (storage.foldername(name))[2]::uuid = get_my_team_id()
  );

create policy "Students can update own review submissions"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'review-submissions'
    and (storage.foldername(name))[1] = 'team'
    and (storage.foldername(name))[2]::uuid = get_my_team_id()
  )
  with check (
    bucket_id = 'review-submissions'
    and (storage.foldername(name))[1] = 'team'
    and (storage.foldername(name))[2]::uuid = get_my_team_id()
  );

create policy "Students can delete own review submissions"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-submissions'
    and (storage.foldername(name))[1] = 'team'
    and (storage.foldername(name))[2]::uuid = get_my_team_id()
  );

create policy "Students can read own review submissions"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'review-submissions'
    and (storage.foldername(name))[1] = 'team'
    and (storage.foldername(name))[2]::uuid = get_my_team_id()
  );

create policy "Teachers can read review submissions for accessible teams"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'review-submissions'
    and (storage.foldername(name))[1] = 'team'
    and can_manage_team_review_files((storage.foldername(name))[2]::uuid)
  );
