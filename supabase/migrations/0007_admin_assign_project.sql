-- Admin: assign a project to a team (for supervisor pre-assigned teams)
create or replace function admin_assign_project(p_team_id uuid, p_project_id uuid)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    return query select false, 'Unauthorized';
    return;
  end if;

  if exists (select 1 from teams where id = p_team_id and selected_project_id is not null) then
    return query select false, 'Team already has a project assigned';
    return;
  end if;

  update projects
  set status = 'locked', locked_by_team_id = p_team_id, locked_at = now()
  where id = p_project_id and status = 'open';

  if not found then
    return query select false, 'Project is not available';
    return;
  end if;

  update teams
  set selected_project_id = p_project_id, locked_by_user_id = null, locked_at = now()
  where id = p_team_id and selected_project_id is null;

  if not found then
    update projects
    set status = 'open', locked_by_team_id = null, locked_at = null
    where id = p_project_id;
    return query select false, 'Failed to assign project to team';
    return;
  end if;

  return query select true, 'Project assigned to team successfully';
end;
$$;

grant execute on function admin_assign_project(uuid, uuid) to authenticated;
