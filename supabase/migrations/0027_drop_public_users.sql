-- Drop leftover public.users table that is not used by the portal.
-- App auth uses auth.users + public.profiles. This table had no RLS and
-- exposed a password column (Supabase linter ERROR).
-- Inspected remotely: empty (0 rows), columns id/email/password only.

drop table if exists public.users;
