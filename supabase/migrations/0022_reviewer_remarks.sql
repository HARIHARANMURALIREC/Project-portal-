-- Add reviewer remarks and date to team_reviews table
-- Reviewers can add their own remarks separate from coordinator/supervisor remarks

alter table team_reviews
  add column if not exists reviewer_remarks text,
  add column if not exists reviewer_remarks_date timestamptz;

-- Update RLS policies to allow reviewers to update their own remarks
create or replace function reviewer_can_manage_team_reviews(p_team_id uuid)
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
        and p.supervisor_name = t.reviewer_name
    );
$$;

-- Drop existing update policy and recreate with reviewer support
drop policy if exists "Supervisors can update team reviews" on team_reviews;
drop policy if exists "Supervisors and Reviewers can update team reviews" on team_reviews;

create policy "Supervisors and Reviewers can update team reviews"
  on team_reviews for update
  to authenticated
  using (
    supervisor_can_manage_team_reviews(team_id)
    or reviewer_can_manage_team_reviews(team_id)
  )
  with check (
    supervisor_can_manage_team_reviews(team_id)
    or reviewer_can_manage_team_reviews(team_id)
  );

grant execute on function reviewer_can_manage_team_reviews(uuid) to authenticated;
