import { supabase } from '@/lib/supabase'
import type { ReviewMarkerRole, StudentReviewMarks } from '@/types/database'

export const ZEROTH_REVIEW_TITLE = 'Zeroth Review'

export const ZEROTH_REVIEW_RUBRICS = [
  { key: 'novelty_idea' as const, label: 'Novelty Idea', max: 10 },
  { key: 'abstract_content' as const, label: 'Abstract Content', max: 5 },
  { key: 'sdg_goal_mapping' as const, label: 'SDG Goal mapping', max: 10 },
] as const

export const ZEROTH_REVIEW_TOTAL_MAX = 25

export function isZerothReview(title: string): boolean {
  return title.trim().toLowerCase() === ZEROTH_REVIEW_TITLE.toLowerCase()
}

export function computeZerothTotal(input: {
  novelty_idea: number
  abstract_content: number
  sdg_goal_mapping: number
}): number {
  return Number((input.novelty_idea + input.abstract_content + input.sdg_goal_mapping).toFixed(1))
}

export async function fetchStudentMarksForReview(teamReviewId: string): Promise<StudentReviewMarks[]> {
  const { data, error } = await supabase
    .from('student_review_marks')
    .select('*')
    .eq('team_review_id', teamReviewId)

  if (error) throw error
  return (data ?? []) as StudentReviewMarks[]
}

export async function fetchStudentMarksForReviews(teamReviewIds: string[]): Promise<StudentReviewMarks[]> {
  if (teamReviewIds.length === 0) return []
  const { data, error } = await supabase
    .from('student_review_marks')
    .select('*')
    .in('team_review_id', teamReviewIds)

  if (error) throw error
  return (data ?? []) as StudentReviewMarks[]
}

export async function upsertStudentZerothMarks(input: {
  teamReviewId: string
  teamId: string
  teamMemberId: string
  role: ReviewMarkerRole
  novelty_idea: number
  abstract_content: number
  sdg_goal_mapping: number
  markedBy: string
}): Promise<StudentReviewMarks> {
  const payload = {
    team_review_id: input.teamReviewId,
    team_id: input.teamId,
    team_member_id: input.teamMemberId,
    role: input.role,
    novelty_idea: input.novelty_idea,
    abstract_content: input.abstract_content,
    sdg_goal_mapping: input.sdg_goal_mapping,
    marked_by: input.markedBy,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('student_review_marks')
    .select('id')
    .eq('team_review_id', input.teamReviewId)
    .eq('team_member_id', input.teamMemberId)
    .eq('role', input.role)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from('student_review_marks')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data as StudentReviewMarks
  }

  const { data, error } = await supabase
    .from('student_review_marks')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data as StudentReviewMarks
}

export function marksKey(teamMemberId: string, role: ReviewMarkerRole): string {
  return `${teamMemberId}:${role}`
}

export function indexStudentMarks(rows: StudentReviewMarks[]): Record<string, StudentReviewMarks> {
  return Object.fromEntries(rows.map((r) => [marksKey(r.team_member_id, r.role), r]))
}
