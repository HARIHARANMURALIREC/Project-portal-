import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { withSortedTeams } from '@/lib/teamSort'
import { useAuth } from '@/hooks/useAuth'
import type { TeamWithDetails } from '@/types/database'

/** Teams this faculty is allotted to review (profiles.supervisor_name = teams.reviewer_name). */
export function useReviewerTeams() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['reviewer-teams', profile?.supervisor_name],
    queryFn: async (): Promise<TeamWithDetails[]> => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (id, reg_no, name),
          projects!teams_selected_project_id_fkey (id, title, domain, abstract),
          batches (id, name)
        `)
        .eq('reviewer_name', profile!.supervisor_name!)
        .order('batch_id', { ascending: true })
        .order('team_no', { ascending: true })

      if (error) throw error
      return withSortedTeams((data ?? []) as TeamWithDetails[])
    },
    enabled: profile?.role === 'teacher' && Boolean(profile.supervisor_name),
    refetchInterval: POLL_INTERVALS.teamReviews,
    refetchOnWindowFocus: true,
  })
}
