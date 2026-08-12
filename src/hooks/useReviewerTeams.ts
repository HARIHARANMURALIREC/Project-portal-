import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { withSortedTeams } from '@/lib/teamSort'
import { useAuth } from '@/hooks/useAuth'
import { getSectionReviewerBatchIds, isSectionReviewer } from '@/lib/sectionReviewers'
import type { TeamWithDetails } from '@/types/database'

/** Teams this faculty is allotted to review, or all teams in a section reviewer's batches. */
export function useReviewerTeams() {
  const { profile } = useAuth()
  const sectionBatchIds = getSectionReviewerBatchIds(profile)
  const sectionReviewer = isSectionReviewer(profile)

  return useQuery({
    queryKey: ['reviewer-teams', profile?.supervisor_name, sectionBatchIds.join(',')],
    queryFn: async (): Promise<TeamWithDetails[]> => {
      let query = supabase
        .from('teams')
        .select(`
          *,
          team_members (id, reg_no, name),
          projects!teams_selected_project_id_fkey (id, title, domain, abstract),
          batches (id, name)
        `)
        .order('batch_id', { ascending: true })
        .order('team_no', { ascending: true })

      query = sectionReviewer
        ? query.in('batch_id', sectionBatchIds)
        : query.eq('reviewer_name', profile!.supervisor_name!)

      const { data, error } = await query
      if (error) throw error
      return withSortedTeams((data ?? []) as TeamWithDetails[])
    },
    enabled: profile?.role === 'teacher' && Boolean(profile.supervisor_name),
    refetchInterval: POLL_INTERVALS.teamReviews,
    refetchOnWindowFocus: true,
  })
}
