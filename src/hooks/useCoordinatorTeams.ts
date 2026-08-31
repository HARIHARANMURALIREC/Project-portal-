import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { fetchCoordinatorTeamsForProfile } from '@/lib/coordinatorData'
import { POLL_INTERVALS } from '@/lib/queryConfig'

export function useCoordinatorTeams() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['coordinator-teams', profile?.role, profile?.supervisor_name ?? 'lead'],
    queryFn: () => fetchCoordinatorTeamsForProfile(profile),
    refetchInterval: POLL_INTERVALS.teamReviews,
    refetchOnWindowFocus: true,
  })
}
