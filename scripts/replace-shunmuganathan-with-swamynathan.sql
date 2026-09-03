-- Restore Dr.K.L. Shunmuganathan (undo Mr.S.Swamynathan swap).
-- Safe to re-run. Auth email changes require scripts/revert-faculty-logins.ts.

update public.teams
set supervisor_name = 'Dr.K.L. Shunmuganathan'
where supervisor_name = 'Mr.S.Swamynathan';

update public.teams
set reviewer_name = 'Dr.K.L. Shunmuganathan'
where reviewer_name = 'Mr.S.Swamynathan';

update public.profiles
set
  full_name = 'Dr.K.L. Shunmuganathan',
  supervisor_name = 'Dr.K.L. Shunmuganathan'
where supervisor_name = 'Mr.S.Swamynathan'
   or full_name = 'Mr.S.Swamynathan';
