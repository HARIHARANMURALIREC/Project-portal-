import { supabase } from '@/lib/supabase'
import type { StudentReviewMarks, TeamReview, TeamReviewFile, TeamWithDetails } from '@/types/database'
import { withSortedTeams } from '@/lib/teamSort'
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
