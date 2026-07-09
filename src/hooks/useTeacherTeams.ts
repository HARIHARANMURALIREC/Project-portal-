import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { withSortedTeams } from '@/lib/teamSort'
import { useAuth } from '@/hooks/useAuth'
import type { TeamWithDetails } from '@/types/database'

export function useTeacherTeams() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['teacher-teams', profile?.supervisor_name],
    queryFn: async (): Promise<TeamWithDetails[]> => {
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
    },
    enabled: profile?.role === 'teacher' && Boolean(profile.supervisor_name),
    refetchInterval: POLL_INTERVALS.teamReviews,
    refetchOnWindowFocus: true,
  })
}
