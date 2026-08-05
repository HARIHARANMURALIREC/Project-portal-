-- Team SDG submissions and publication status tracking
-- Run in Supabase SQL Editor if needed

create table if not exists public.team_sdg_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sdg_goal text not null,
  description text not null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_sdg_entries_team_id_idx on public.team_sdg_entries(team_id);

alter table public.team_sdg_entries enable row level security;

create policy "Auth read team sdg entries"
  on public.team_sdg_entries for select to authenticated using (true);

create policy "Auth insert team sdg entries"
  on public.team_sdg_entries for insert to authenticated with check (true);

create policy "Auth update team sdg entries"
  on public.team_sdg_entries for update to authenticated using (true) with check (true);

create policy "Auth delete team sdg entries"
  on public.team_sdg_entries for delete to authenticated using (true);

create table if not exists public.team_publication_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null,
  details text not null,
  entry_date date not null default current_date,
  storage_path text,
  original_filename text,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_publication_entries_team_id_idx on public.team_publication_entries(team_id);

alter table public.team_publication_entries enable row level security;

create policy "Auth read team publication entries"
  on public.team_publication_entries for select to authenticated using (true);

create policy "Auth insert team publication entries"
  on public.team_publication_entries for insert to authenticated with check (true);

create policy "Auth update team publication entries"
  on public.team_publication_entries for update to authenticated using (true) with check (true);

create policy "Auth delete team publication entries"
  on public.team_publication_entries for delete to authenticated using (true);
