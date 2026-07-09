import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import type { TeamReview } from '@/types/database'

export function useTeamReviews(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-reviews', teamId],
    queryFn: async (): Promise<TeamReview[]> => {
      const { data, error } = await supabase
        .from('team_reviews')
        .select('*')
        .eq('team_id', teamId!)
        .order('scheduled_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as TeamReview[]
    },
    enabled: Boolean(teamId),
    refetchInterval: POLL_INTERVALS.teamReviews,
    refetchOnWindowFocus: true,
  })
}
