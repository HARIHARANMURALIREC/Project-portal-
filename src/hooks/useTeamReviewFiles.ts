import { useQuery } from '@tanstack/react-query'
import { fetchReviewFilesForTeam } from '@/lib/reviewFiles'
import { POLL_INTERVALS } from '@/lib/queryConfig'

export function useTeamReviewFiles(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-review-files', teamId],
    queryFn: () => fetchReviewFilesForTeam(teamId!),
    enabled: Boolean(teamId),
    refetchInterval: POLL_INTERVALS.teamReviews,
    refetchOnWindowFocus: true,
  })
}
