import { supabase } from '@/lib/supabase'
import type { TeamReview } from '@/types/database'

export const REVIEW_TITLE_OPTIONS = [
  'Review 1',
  'Review 2',
  'Review 3',
  'Internal Review',
  'External Review',
  'Final Review',
] as const

export function formatReviewDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
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

export async function createTeamReview(input: {
  teamId: string
  reviewTitle: string
  scheduledAt: string
  remarks?: string
  createdBy: string
}): Promise<TeamReview> {
  const { data, error } = await supabase
    .from('team_reviews')
    .insert({
      team_id: input.teamId,
      review_title: input.reviewTitle.trim(),
      scheduled_at: new Date(input.scheduledAt).toISOString(),
      remarks: input.remarks?.trim() || null,
      created_by: input.createdBy,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as TeamReview
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
