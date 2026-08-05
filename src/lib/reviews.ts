import { supabase } from '@/lib/supabase'
import type { ReviewScheduleSummary, TeamReview } from '@/types/database'

export const REVIEW_TITLE_OPTIONS = [
  'Zeroth Review',
  'First Review',
  'Second Review',
  'Third Review',
  'Internal Review',
  'External Review',
  'Final Review',
] as const

/** Standard milestone reviews shown in filters (Zeroth–Third). */
export const STANDARD_REVIEW_TITLES = REVIEW_TITLE_OPTIONS.slice(0, 4)

export function formatReviewDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** Formats a review window: single date, or Date 1 – Date 2 when end is set. */
export function formatReviewSchedule(
  scheduledAt: string,
  scheduledEndAt?: string | null,
): string {
  const start = formatReviewDateTime(scheduledAt)
  if (!scheduledEndAt) return start
  return `${start} – ${formatReviewDateTime(scheduledEndAt)}`
}

export function isReviewCompleted(review: Pick<TeamReview, 'completed_at'>): boolean {
  return review.completed_at != null
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export async function fetchTeamReviews(teamId: string): Promise<TeamReview[]> {
  const { data, error } = await supabase
    .from('team_reviews')
    .select('*')
    .eq('team_id', teamId)
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as TeamReview[]
}

export async function completeTeamReview(reviewId: string, userId: string): Promise<TeamReview> {
  const { data, error } = await supabase
    .from('team_reviews')
    .update({
      completed_at: new Date().toISOString(),
      completed_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select('*')
    .single()

  if (error) throw error
  return data as TeamReview
}

export async function reopenTeamReview(reviewId: string): Promise<TeamReview> {
  const { data, error } = await supabase
    .from('team_reviews')
    .update({
      completed_at: null,
      completed_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select('*')
    .single()

  if (error) throw error
  return data as TeamReview
}

export async function fetchCoordinatorReviewSchedules(): Promise<ReviewScheduleSummary[]> {
  const { data, error } = await supabase.rpc('coordinator_list_review_schedules')
  if (error) throw error
  return (data ?? []) as ReviewScheduleSummary[]
}

export async function scheduleReviewForAllTeams(input: {
  reviewTitle: string
  scheduledAt: string
  scheduledEndAt: string
  remarks?: string
}): Promise<{ schedule_group_id: string; teams_scheduled: number }> {
  const { data, error } = await supabase.rpc('coordinator_schedule_review_for_all', {
    p_review_title: input.reviewTitle.trim(),
    p_scheduled_at: new Date(input.scheduledAt).toISOString(),
    p_remarks: input.remarks?.trim() || null,
    p_scheduled_end_at: new Date(input.scheduledEndAt).toISOString(),
    // Automatically set to the moment the review is allotted
    p_announced_at: new Date().toISOString(),
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Failed to schedule review')
  return row as { schedule_group_id: string; teams_scheduled: number }
}

export async function rescheduleReviewForAllTeams(input: {
  scheduleGroupId: string
  scheduledAt: string
  scheduledEndAt: string
  remarks?: string
}): Promise<number> {
  const { data, error } = await supabase.rpc('coordinator_reschedule_review', {
    p_schedule_group_id: input.scheduleGroupId,
    p_scheduled_at: new Date(input.scheduledAt).toISOString(),
    p_remarks: input.remarks?.trim() || null,
    p_scheduled_end_at: new Date(input.scheduledEndAt).toISOString(),
    // Keep original announcement date when only review dates/notes change
    p_announced_at: null,
  })
  if (error) throw error
  return (data as number) ?? 0
}

export async function deleteReviewSchedule(scheduleGroupId: string): Promise<number> {
  const { data, error } = await supabase.rpc('coordinator_delete_review_schedule', {
    p_schedule_group_id: scheduleGroupId,
  })
  if (error) throw error
  return (data as number) ?? 0
}

export interface ScheduleTeamStatus {
  id: string
  team_id: string
  batch_code: string
  supervisor_name: string | null
  reviewer_name: string | null
  completed_at: string | null
  team_members: { id: string; reg_no: string; name: string }[]
}

export async function fetchScheduleTeamStatus(scheduleGroupId: string): Promise<ScheduleTeamStatus[]> {
  const { data, error } = await supabase
    .from('team_reviews')
    .select(`
      id,
      team_id,
      completed_at,
      teams!inner (
        batch_code,
        supervisor_name,
        reviewer_name,
        team_members (id, reg_no, name)
      )
    `)
    .eq('schedule_group_id', scheduleGroupId)
    .order('team_id')

  if (error) throw error

  const rows = (data ?? []).map((row) => {
    type TeamJoin = {
      batch_code: string
      supervisor_name: string | null
      reviewer_name: string | null
      team_members: { id: string; reg_no: string; name: string }[] | null
    }
    const team = row.teams as TeamJoin | TeamJoin[]
    const teamRow = Array.isArray(team) ? team[0] : team
    return {
      id: row.id as string,
      team_id: row.team_id as string,
      batch_code: teamRow?.batch_code ?? '—',
      supervisor_name: teamRow?.supervisor_name ?? null,
      reviewer_name: teamRow?.reviewer_name ?? null,
      completed_at: row.completed_at as string | null,
      team_members: teamRow?.team_members ?? [],
    }
  })

  return rows.sort((a, b) => {
    const supervisorOrder = (a.supervisor_name ?? '').localeCompare(b.supervisor_name ?? '')
    if (supervisorOrder !== 0) return supervisorOrder
    return a.batch_code.localeCompare(b.batch_code, undefined, { numeric: true })
  })
}

export async function fetchCoordinatorRemarksForTeam(teamId: string): Promise<TeamReview[]> {
  const { data, error } = await supabase
    .from('team_reviews')
    .select('*')
    .eq('team_id', teamId)
    .not('remarks', 'is', null)
    .not('schedule_group_id', 'is', null)
    .order('scheduled_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as TeamReview[]
}
