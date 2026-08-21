import { supabase } from '@/lib/supabase'
import { isSectionReviewer } from '@/lib/sectionReviewers'
import type {
  Profile,
  ReviewMarkerRole,
  StudentProgressiveReviewMarks,
  StudentReviewMarks,
} from '@/types/database'

export function reviewerMarkerRoleForProfile(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): Extract<ReviewMarkerRole, 'internal_reviewer' | 'external_reviewer'> {
  return isSectionReviewer(profile) ? 'external_reviewer' : 'internal_reviewer'
}

export function isInternalReviewerRole(role: ReviewMarkerRole): boolean {
  return role === 'internal_reviewer' || role === 'reviewer'
}

export function isExternalReviewerRole(role: ReviewMarkerRole): boolean {
  return role === 'external_reviewer'
}

/** Roles to try when reading/writing reviewer marks (legacy `reviewer` first for live RLS compatibility). */
export function reviewerRoleLookupOrder(role: ReviewMarkerRole): ReviewMarkerRole[] {
  if (role === 'external_reviewer') return ['external_reviewer', 'reviewer']
  if (role === 'internal_reviewer' || role === 'reviewer') return ['reviewer', 'internal_reviewer']
  return [role]
}

function throwSaveError(
  error: { message?: string; details?: string; hint?: string; code?: string } | null,
): never {
  const parts = [error?.message, error?.details, error?.hint].filter(Boolean)
  throw new Error(parts.join(' — ') || 'Failed to save marks')
}

function isRoleCompatibilityError(error: { message?: string; code?: string } | null): boolean {
  const msg = (error?.message ?? '').toLowerCase()
  return (
    error?.code === '23514' ||
    error?.code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('violates check constraint') ||
    msg.includes('role_check')
  )
}

export const ZEROTH_REVIEW_TITLE = 'Zeroth Review'

export const ZEROTH_REVIEW_RUBRICS = [
  { key: 'novelty_idea' as const, label: 'Novelty Idea', max: 10 },
  { key: 'abstract_content' as const, label: 'Abstract Content', max: 5 },
  { key: 'sdg_goal_mapping' as const, label: 'SDG Goal mapping', max: 10 },
] as const

export const ZEROTH_REVIEW_TOTAL_MAX = 25

export type ReviewSlot = '0th' | '1st' | '2nd' | '3rd'

export const REVIEW_SLOT_OPTIONS: { value: ReviewSlot; label: string }[] = [
  { value: '0th', label: '0th Review' },
  { value: '1st', label: '1st Review' },
  { value: '2nd', label: '2nd Review' },
  { value: '3rd', label: '3rd Review' },
]

export const PROGRESSIVE_REVIEW_RUBRICS = [
  { key: 'feasibility' as const, label: 'Feasibility', max: 10 },
  { key: 'proposed_methodology' as const, label: 'Proposed Methodology', max: 10 },
  { key: 'background' as const, label: 'Background', max: 10 },
  { key: 'literature_survey' as const, label: 'Literature Survey', max: 10 },
  { key: 'reference_paper' as const, label: 'Reference Paper', max: 10 },
] as const

export const PROGRESSIVE_REVIEW_TOTAL_MAX = 50

export type ProgressiveRubricKey = (typeof PROGRESSIVE_REVIEW_RUBRICS)[number]['key']

export function emptyProgressiveScores(): Record<ProgressiveRubricKey, string> {
  return {
    feasibility: '',
    proposed_methodology: '',
    background: '',
    literature_survey: '',
    reference_paper: '',
  }
}

export function isZerothReview(title: string): boolean {
  return title.trim().toLowerCase() === ZEROTH_REVIEW_TITLE.toLowerCase()
}

export function matchReviewSlot(title: string, slot: ReviewSlot): boolean {
  const t = title.trim().toLowerCase()
  if (slot === '0th') {
    return isZerothReview(title) || /\b0th\b/.test(t) || /\bzeroth\b/.test(t)
  }
  if (slot === '1st') {
    return /\b1st\b/.test(t) || /\bfirst\b/.test(t) || t === 'review 1' || t.includes('review-1')
  }
  if (slot === '2nd') {
    return /\b2nd\b/.test(t) || /\bsecond\b/.test(t) || t === 'review 2' || t.includes('review-2')
  }
  return /\b3rd\b/.test(t) || /\bthird\b/.test(t) || t === 'review 3' || t.includes('review-3')
}

export function isProgressiveReviewSlot(slot: ReviewSlot): boolean {
  return slot === '1st' || slot === '2nd' || slot === '3rd'
}

export function computeZerothTotal(input: {
  novelty_idea: number
  abstract_content: number
  sdg_goal_mapping: number
}): number {
  return Number((input.novelty_idea + input.abstract_content + input.sdg_goal_mapping).toFixed(1))
}

export function computeProgressiveTotal(input: Record<ProgressiveRubricKey, number>): number {
  return Number(
    PROGRESSIVE_REVIEW_RUBRICS.reduce((sum, r) => sum + input[r.key], 0).toFixed(1),
  )
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
  const roles = reviewerRoleLookupOrder(input.role)
  let existing: { id: string; role: ReviewMarkerRole } | null = null

  for (const role of roles) {
    const { data } = await supabase
      .from('student_review_marks')
      .select('id, role')
      .eq('team_review_id', input.teamReviewId)
      .eq('team_member_id', input.teamMemberId)
      .eq('role', role)
      .maybeSingle()
    if (data?.id) {
      existing = data as { id: string; role: ReviewMarkerRole }
      break
    }
  }

  const basePayload = {
    team_review_id: input.teamReviewId,
    team_id: input.teamId,
    team_member_id: input.teamMemberId,
    novelty_idea: input.novelty_idea,
    abstract_content: input.abstract_content,
    sdg_goal_mapping: input.sdg_goal_mapping,
    marked_by: input.markedBy,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('student_review_marks')
      .update({ ...basePayload, role: existing.role })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throwSaveError(error)
    return data as StudentReviewMarks
  }

  let lastError: { message?: string; details?: string; hint?: string; code?: string } | null = null
  for (const role of roles) {
    const { data, error } = await supabase
      .from('student_review_marks')
      .insert({ ...basePayload, role })
      .select('*')
      .single()
    if (!error) return data as StudentReviewMarks
    lastError = error
    if (!isRoleCompatibilityError(error)) throwSaveError(error)
  }
  throwSaveError(lastError)
}

export async function fetchProgressiveMarksForReview(
  teamReviewId: string,
): Promise<StudentProgressiveReviewMarks[]> {
  const { data, error } = await supabase
    .from('student_progressive_review_marks')
    .select('*')
    .eq('team_review_id', teamReviewId)

  if (error) throw error
  return (data ?? []) as StudentProgressiveReviewMarks[]
}

export async function upsertStudentProgressiveMarks(input: {
  teamReviewId: string
  teamId: string
  teamMemberId: string
  role: ReviewMarkerRole
  feasibility: number
  proposed_methodology: number
  background: number
  literature_survey: number
  reference_paper: number
  markedBy: string
}): Promise<StudentProgressiveReviewMarks> {
  const roles = reviewerRoleLookupOrder(input.role)
  let existing: { id: string; role: ReviewMarkerRole } | null = null

  for (const role of roles) {
    const { data } = await supabase
      .from('student_progressive_review_marks')
      .select('id, role')
      .eq('team_review_id', input.teamReviewId)
      .eq('team_member_id', input.teamMemberId)
      .eq('role', role)
      .maybeSingle()
    if (data?.id) {
      existing = data as { id: string; role: ReviewMarkerRole }
      break
    }
  }

  const basePayload = {
    team_review_id: input.teamReviewId,
    team_id: input.teamId,
    team_member_id: input.teamMemberId,
    feasibility: input.feasibility,
    proposed_methodology: input.proposed_methodology,
    background: input.background,
    literature_survey: input.literature_survey,
    reference_paper: input.reference_paper,
    marked_by: input.markedBy,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('student_progressive_review_marks')
      .update({ ...basePayload, role: existing.role })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throwSaveError(error)
    return data as StudentProgressiveReviewMarks
  }

  let lastError: { message?: string; details?: string; hint?: string; code?: string } | null = null
  for (const role of roles) {
    const { data, error } = await supabase
      .from('student_progressive_review_marks')
      .insert({ ...basePayload, role })
      .select('*')
      .single()
    if (!error) return data as StudentProgressiveReviewMarks
    lastError = error
    if (!isRoleCompatibilityError(error)) throwSaveError(error)
  }
  throwSaveError(lastError)
}

export function marksKey(teamMemberId: string, role: ReviewMarkerRole): string {
  return `${teamMemberId}:${role}`
}

export function indexStudentMarks(rows: StudentReviewMarks[]): Record<string, StudentReviewMarks> {
  return Object.fromEntries(rows.map((r) => [marksKey(r.team_member_id, r.role), r]))
}

export function indexProgressiveMarks(
  rows: StudentProgressiveReviewMarks[],
): Record<string, StudentProgressiveReviewMarks> {
  return Object.fromEntries(rows.map((r) => [marksKey(r.team_member_id, r.role), r]))
}

export function lookupMarksForRole<T>(
  index: Record<string, T>,
  teamMemberId: string,
  role: ReviewMarkerRole,
): T | undefined {
  for (const candidate of reviewerRoleLookupOrder(role)) {
    const hit = index[marksKey(teamMemberId, candidate)]
    if (hit) return hit
  }
  return undefined
}
