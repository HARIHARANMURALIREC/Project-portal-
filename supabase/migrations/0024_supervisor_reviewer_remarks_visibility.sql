-- Update RLS policies to allow supervisors to read reviewer remarks
-- Reviewer remarks should be visible to students and their respective supervisors

-- Update teacher_can_read_team_reviews to include reviewers
create or replace function teacher_can_read_team_reviews(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select supervisor_can_manage_team_reviews(p_team_id)
    or exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = p_team_id
        and p.role = 'teacher'
        and p.supervisor_name is not null
        and p.supervisor_name = t.reviewer_name
    )
    or is_lead_teacher();
$$;

-- Ensure the select policy is updated
drop policy if exists "Teachers can read team reviews" on team_reviews;

create policy "Teachers can read team reviews"
  on team_reviews for select
  to authenticated
  using (teacher_can_read_team_reviews(team_id));
