-- Allow project selection regardless of batch open/closed state
create or replace function claim_project(p_team_id uuid, p_project_id uuid)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_team_id uuid;
begin
  select tm.team_id into v_member_team_id
  from team_members tm
  where tm.user_id = auth.uid() and tm.team_id = p_team_id;

  if v_member_team_id is null then
    return query select false, 'You are not a member of this team';
    return;
  end if;

  update projects
  set status = 'locked', locked_by_team_id = p_team_id, locked_at = now()
  where id = p_project_id and status = 'open';

  if not found then
    return query select false, 'Project already taken by another team';
    return;
  end if;

  update teams
  set selected_project_id = p_project_id, locked_by_user_id = auth.uid(), locked_at = now()
  where id = p_team_id and selected_project_id is null;

  if not found then
    update projects
    set status = 'open', locked_by_team_id = null, locked_at = null
    where id = p_project_id;
    return query select false, 'Your team has already selected a project';
    return;
  end if;

  return query select true, 'Project successfully claimed';
end;
$$;
