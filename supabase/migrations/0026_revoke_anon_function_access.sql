-- Revoke anon (unauthenticated) execute access from all SECURITY DEFINER functions.
-- These functions are only meant to be called by signed-in users (authenticated role).
-- Fixes: anon_security_definer_function_executable warnings from Supabase linter.

-- Helper / role-check functions
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_lead_teacher() from anon;
revoke execute on function public.is_batch_coordinator() from anon;
revoke execute on function public.is_batch_coordinator_for(text) from anon;
revoke execute on function public.get_my_team_id() from anon;
revoke execute on function public.get_my_batch_coordinator_batch_id() from anon;
revoke execute on function public.get_portal_status() from anon;

-- Review access helpers
revoke execute on function public.supervisor_can_manage_team_reviews(uuid) from anon;
revoke execute on function public.reviewer_can_manage_team_reviews(uuid) from anon;
revoke execute on function public.teacher_can_read_team_reviews(uuid) from anon;
revoke execute on function public.can_manage_team_review_files(uuid) from anon;
revoke execute on function public.can_edit_student_review_marks(uuid, text) from anon;
revoke execute on function public.can_view_student_review_marks(uuid) from anon;

-- Coordinator scheduling functions
revoke execute on function public.coordinator_schedule_review_for_all(text, timestamptz, text) from anon;
revoke execute on function public.coordinator_list_review_schedules() from anon;
revoke execute on function public.coordinator_reschedule_review(uuid, timestamptz, text) from anon;
revoke execute on function public.coordinator_delete_review_schedule(uuid) from anon;

-- Admin-only functions (also restrict to admin role inside the function body, but revoke from anon too)
revoke execute on function public.admin_assign_project(uuid, uuid) from anon;
revoke execute on function public.admin_force_unlock(uuid) from anon;
revoke execute on function public.admin_supervisor_login_status() from anon;

-- Supervisor self-service
revoke execute on function public.mark_supervisor_password_changed() from anon;

-- Student project claiming
revoke execute on function public.claim_project(uuid, uuid) from anon;

-- Confirm authenticated role still has access to everything it needs
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_lead_teacher() to authenticated;
grant execute on function public.is_batch_coordinator() to authenticated;
grant execute on function public.is_batch_coordinator_for(text) to authenticated;
grant execute on function public.get_my_team_id() to authenticated;
grant execute on function public.get_my_batch_coordinator_batch_id() to authenticated;
grant execute on function public.get_portal_status() to authenticated;
grant execute on function public.supervisor_can_manage_team_reviews(uuid) to authenticated;
grant execute on function public.reviewer_can_manage_team_reviews(uuid) to authenticated;
grant execute on function public.teacher_can_read_team_reviews(uuid) to authenticated;
grant execute on function public.can_manage_team_review_files(uuid) to authenticated;
grant execute on function public.can_edit_student_review_marks(uuid, text) to authenticated;
grant execute on function public.can_view_student_review_marks(uuid) to authenticated;
grant execute on function public.coordinator_schedule_review_for_all(text, timestamptz, text) to authenticated;
grant execute on function public.coordinator_list_review_schedules() to authenticated;
grant execute on function public.coordinator_reschedule_review(uuid, timestamptz, text) to authenticated;
grant execute on function public.coordinator_delete_review_schedule(uuid) to authenticated;
grant execute on function public.admin_assign_project(uuid, uuid) to authenticated;
grant execute on function public.admin_force_unlock(uuid) to authenticated;
grant execute on function public.admin_supervisor_login_status() to authenticated;
grant execute on function public.mark_supervisor_password_changed() to authenticated;
grant execute on function public.claim_project(uuid, uuid) to authenticated;
