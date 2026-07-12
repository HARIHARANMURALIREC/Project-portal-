import { supabase } from '@/lib/supabase'
import type { TeamReviewMarks } from '@/types/database'

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

export async function fetchMarksForReview(teamReviewId: string): Promise<TeamReviewMarks | null> {
  const { data, error } = await supabase
    .from('team_review_marks')
    .select('*')
    .eq('team_review_id', teamReviewId)
    .maybeSingle()

  if (error) throw error
  return (data as TeamReviewMarks | null) ?? null
}

export async function fetchMarksForReviews(teamReviewIds: string[]): Promise<TeamReviewMarks[]> {
  if (teamReviewIds.length === 0) return []
  const { data, error } = await supabase
    .from('team_review_marks')
    .select('*')
    .in('team_review_id', teamReviewIds)

  if (error) throw error
  return (data ?? []) as TeamReviewMarks[]
}

export async function upsertZerothMarks(input: {
  teamReviewId: string
  teamId: string
  novelty_idea: number
  abstract_content: number
  sdg_goal_mapping: number
  markedBy: string
}): Promise<TeamReviewMarks> {
  const payload = {
    team_review_id: input.teamReviewId,
    team_id: input.teamId,
    novelty_idea: input.novelty_idea,
    abstract_content: input.abstract_content,
    sdg_goal_mapping: input.sdg_goal_mapping,
    marked_by: input.markedBy,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('team_review_marks')
    .select('id')
    .eq('team_review_id', input.teamReviewId)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from('team_review_marks')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data as TeamReviewMarks
  }

  const { data, error } = await supabase
    .from('team_review_marks')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data as TeamReviewMarks
}
