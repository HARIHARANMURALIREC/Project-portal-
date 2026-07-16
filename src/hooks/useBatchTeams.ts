import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { withSortedTeams } from '@/lib/teamSort'
import type { TeamWithDetails } from '@/types/database'

export function useBatchTeams(batchId: string | null) {
  return useQuery({
    queryKey: ['batch-teams', batchId],
    queryFn: async (): Promise<TeamWithDetails[]> => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (id, reg_no, name),
          projects!teams_selected_project_id_fkey (id, title, domain, abstract),
          batches (id, name)
        `)
        .eq('batch_id', batchId!)
        .order('team_no', { ascending: true })

      if (error) throw error
      return withSortedTeams((data ?? []) as TeamWithDetails[])
    },
    enabled: Boolean(batchId),
    refetchInterval: POLL_INTERVALS.teamReviews,
    refetchOnWindowFocus: true,
  })
}
