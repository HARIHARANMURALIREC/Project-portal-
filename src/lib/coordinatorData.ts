import { supabase } from '@/lib/supabase'
import type {
  Profile,
  StudentProgressiveReviewMarks,
  StudentReviewMarks,
  TeamReview,
  TeamReviewFile,
  TeamWithDetails,
} from '@/types/database'
import { getBatchIdForCoordinator } from '@/lib/batchCoordinators'
import { withSortedTeams } from '@/lib/teamSort'
import { isLeadCoordinator } from '@/lib/teacherRoutes'
import { ZEROTH_REVIEW_TITLE } from '@/lib/reviewMarks'

export async function fetchAllCoordinatorTeams(): Promise<TeamWithDetails[]> {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_members (id, reg_no, name),
      projects!teams_selected_project_id_fkey (id, title, domain, abstract),
      batches (id, name)
    `)
    .order('batch_id', { ascending: true })
    .order('team_no', { ascending: true })

  if (error) throw error
  return withSortedTeams((data ?? []) as TeamWithDetails[])
}

/** Lead coordinator: all teams. Section coordinator: only their batch (IT A → 27A*, etc.). */
export async function fetchCoordinatorTeamsForProfile(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): Promise<TeamWithDetails[]> {
  const teams = await fetchAllCoordinatorTeams()
  if (isLeadCoordinator(profile)) return teams

  const batchId = getBatchIdForCoordinator(profile)
  if (!batchId) return teams

  return teams.filter((team) => team.batch_id === batchId)
}

export async function fetchAllReviewFiles(): Promise<TeamReviewFile[]> {
  const { data, error } = await supabase
    .from('team_review_files')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as TeamReviewFile[]
}

export async function fetchAllStudentReviewMarks(): Promise<StudentReviewMarks[]> {
  const { data, error } = await supabase.from('student_review_marks').select('*')
  if (error) throw error
  return (data ?? []) as StudentReviewMarks[]
}

export async function fetchAllProgressiveReviewMarks(): Promise<StudentProgressiveReviewMarks[]> {
  const { data, error } = await supabase.from('student_progressive_review_marks').select('*')
  if (error) throw error
  return (data ?? []) as StudentProgressiveReviewMarks[]
}

export async function fetchZerothReviews(): Promise<TeamReview[]> {
  const { data, error } = await supabase
    .from('team_reviews')
    .select('*')
    .eq('review_title', ZEROTH_REVIEW_TITLE)
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as TeamReview[]
}

export async function fetchAllTeamReviews(): Promise<TeamReview[]> {
  const { data, error } = await supabase
    .from('team_reviews')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as TeamReview[]
}
