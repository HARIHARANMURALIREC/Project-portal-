-- Batch coordinators need batch_code on all teams when listing portal-wide
-- template uploads (team_template_uploads RLS is open to all authenticated users).

create policy "Batch coordinators can read all teams for portal"
  on public.teams for select
  to authenticated
  using (public.is_batch_coordinator());
