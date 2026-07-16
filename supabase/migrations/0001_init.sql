-- Project Allotment Portal — initial schema, RLS, and RPC functions

-- =============================================================================
-- TABLES
-- =============================================================================

create table batches (
  id text primary key,
  name text not null,
  is_open boolean default false,
  opened_at timestamptz,
  closed_at timestamptz
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  s_no integer,
  domain text,
  title text not null,
  abstract text,
  status text not null default 'open' check (status in ('open', 'locked')),
  locked_by_team_id uuid,
  locked_at timestamptz
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  batch_id text references batches(id) not null,
  team_no integer not null,
  batch_code text not null,
  supervisor_name text,
  selected_project_id uuid references projects(id),
  locked_by_user_id uuid references auth.users(id),
  locked_at timestamptz,
  teacher_comments text,
  unique(batch_id, team_no)
);

-- Add circular FK after teams exists
alter table projects
  add constraint projects_locked_by_team_id_fkey
  foreign key (locked_by_team_id) references teams(id);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  reg_no text unique not null,
  name text not null,
  user_id uuid references auth.users(id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'student')),
  reg_no text,
  supervisor_name text,
  full_name text
);

create unique index one_selection_per_team on teams(id) where selected_project_id is not null;

-- =============================================================================
-- HELPER: student's team id (avoids RLS infinite recursion on team_members)
-- =============================================================================

create or replace function get_my_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from team_members where user_id = auth.uid() limit 1;
$$;

-- =============================================================================
-- HELPER: check if current user is admin
-- =============================================================================

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- =============================================================================
-- RPC: atomic project claim
-- =============================================================================

create or replace function claim_project(p_team_id uuid, p_project_id uuid)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_team_id uuid;
begin
  -- Verify caller is a member of the team
  select tm.team_id into v_member_team_id
  from team_members tm
  where tm.user_id = auth.uid() and tm.team_id = p_team_id;

  if v_member_team_id is null then
    return query select false, 'You are not a member of this team';
    return;
  end if;

  -- Lock the project row first
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

-- =============================================================================
-- RPC: admin force unlock
-- =============================================================================

create or replace function admin_force_unlock(p_team_id uuid)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if not is_admin() then
    return query select false, 'Unauthorized';
    return;
  end if;

  select selected_project_id into v_project_id from teams where id = p_team_id;

  if v_project_id is null then
    return query select false, 'Team has no selection to unlock';
    return;
  end if;

  update teams
  set selected_project_id = null, locked_by_user_id = null, locked_at = null
  where id = p_team_id;

  update projects
  set status = 'open', locked_by_team_id = null, locked_at = null
  where id = v_project_id;

  return query select true, 'Team unlocked successfully';
end;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table batches enable row level security;
alter table projects enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table profiles enable row level security;

-- profiles
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select
  using (is_admin());

-- batches
create policy "Authenticated users can read batches"
  on batches for select
  to authenticated
  using (true);

create policy "Admins can update batches"
  on batches for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- projects (read-only for clients; writes via security definer RPC)
create policy "Authenticated users can read projects"
  on projects for select
  to authenticated
  using (true);

-- teams
create policy "Students can read own team"
  on teams for select
  to authenticated
  using (id = get_my_team_id());

create policy "Teachers can read supervised teams"
  on teams for select
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
        and p.supervisor_name = teams.supervisor_name
    )
  );

create policy "Admins can read all teams"
  on teams for select
  to authenticated
  using (is_admin());

create policy "Admins can update all teams"
  on teams for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Teachers can update comments on supervised teams"
  on teams for update
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
        and p.supervisor_name = teams.supervisor_name
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
        and p.supervisor_name = teams.supervisor_name
    )
  );

-- team_members
create policy "Students can read own team member row"
  on team_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "Students can read teammates"
  on team_members for select
  to authenticated
  using (team_id = get_my_team_id());

create policy "Teachers can read members of supervised teams"
  on team_members for select
  to authenticated
  using (
    exists (
      select 1 from teams t
      join profiles p on p.id = auth.uid()
      where t.id = team_members.team_id
        and p.role = 'teacher'
        and p.supervisor_name = t.supervisor_name
    )
  );

create policy "Admins can read all team members"
  on team_members for select
  to authenticated
  using (is_admin());

-- =============================================================================
-- GRANTS
-- =============================================================================

grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant update on batches to authenticated;
grant update on teams to authenticated;
grant execute on function get_my_team_id() to authenticated;
grant execute on function claim_project(uuid, uuid) to authenticated;
grant execute on function admin_force_unlock(uuid) to authenticated;
grant execute on function is_admin() to authenticated;

-- =============================================================================
-- REALTIME
-- =============================================================================

alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table batches;

-- =============================================================================
-- SEED BATCHES
-- =============================================================================

insert into batches (id, name, is_open) values
  ('A', 'IT A', false),
  ('B', 'IT B', false),
  ('C', 'IT C', false),
  ('D', 'IT D', false);
