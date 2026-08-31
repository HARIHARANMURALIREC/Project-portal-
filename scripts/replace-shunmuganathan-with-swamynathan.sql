-- Replace Dr.K.L. Shunmuganathan with Mr.S.Swamynathan on teams.
-- Safe to re-run. Run in Supabase SQL Editor if needed.
-- Auth user changes require scripts/replace-faculty.ts (service role).

update public.teams
set supervisor_name = 'Mr.S.Swamynathan'
where supervisor_name = 'Dr.K.L. Shunmuganathan';

update public.teams
set reviewer_name = 'Mr.S.Swamynathan'
where reviewer_name = 'Dr.K.L. Shunmuganathan';

update public.profiles
set
  full_name = 'Mr.S.Swamynathan',
  supervisor_name = 'Mr.S.Swamynathan'
where supervisor_name = 'Dr.K.L. Shunmuganathan'
   or full_name = 'Dr.K.L. Shunmuganathan';
