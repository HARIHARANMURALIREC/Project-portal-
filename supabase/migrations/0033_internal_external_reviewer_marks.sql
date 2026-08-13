-- Split reviewer marks into internal (faculty) vs external (section reviewer logins).
-- Safe to re-run (idempotent).

-- student_review_marks.role
alter table public.student_review_marks
  drop constraint if exists student_review_marks_role_check;

alter table public.student_review_marks
  add constraint student_review_marks_role_check
  check (role in ('supervisor', 'reviewer', 'internal_reviewer', 'external_reviewer'));

-- student_progressive_review_marks.role
alter table public.student_progressive_review_marks
  drop constraint if exists student_progressive_review_marks_role_check;

alter table public.student_progressive_review_marks
  add constraint student_progressive_review_marks_role_check
  check (role in ('supervisor', 'reviewer', 'internal_reviewer', 'external_reviewer'));

-- Map existing section-reviewer-entered rows to external; remaining legacy reviewer → internal
update public.student_review_marks m
set role = 'external_reviewer'
from public.profiles p
where m.marked_by = p.id
  and m.role = 'reviewer'
  and p.supervisor_name in ('Section Reviewer 1', 'Section Reviewer 2');

update public.student_review_marks
set role = 'internal_reviewer'
where role = 'reviewer';

update public.student_progressive_review_marks m
set role = 'external_reviewer'
from public.profiles p
where m.marked_by = p.id
  and m.role = 'reviewer'
  and p.supervisor_name in ('Section Reviewer 1', 'Section Reviewer 2');

update public.student_progressive_review_marks
set role = 'internal_reviewer'
where role = 'reviewer';

create or replace function public.can_edit_student_review_marks(p_team_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from teams t
    join profiles p on p.id = auth.uid()
    where t.id = p_team_id
      and p.role = 'teacher'
      and p.supervisor_name is not null
      and (
        (p_role = 'supervisor' and p.supervisor_name = t.supervisor_name)
        or (
          p_role in ('reviewer', 'internal_reviewer')
          and p.supervisor_name = t.reviewer_name
          and not is_section_reviewer()
        )
        or (
          p_role in ('reviewer', 'external_reviewer')
          and is_section_reviewer_for(t.batch_id)
        )
      )
  );
$$;

grant execute on function public.can_edit_student_review_marks(uuid, text) to authenticated;
revoke execute on function public.can_edit_student_review_marks(uuid, text) from anon;
