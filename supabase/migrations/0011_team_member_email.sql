-- Student college email for post-selection notifications (imported from Excel).
alter table team_members add column if not exists email text;

create index if not exists team_members_email_idx on team_members (email)
  where email is not null;

-- Log outbound selection emails (idempotency + debugging).
create table if not exists selection_email_log (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  member_id uuid references team_members(id) on delete set null,
  email text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz not null default now(),
  unique (team_id, member_id)
);

alter table selection_email_log enable row level security;

create policy "Admins can read selection email log"
  on selection_email_log for select
  to authenticated
  using (is_admin());

grant select on selection_email_log to authenticated;
