import { ReviewerPageShell } from '@/components/reviewer/ReviewerPageShell'
import { TeamSdgOverviewPanel } from '@/components/shared/TeamSdgOverviewPanel'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useReviewerTeams } from '@/hooks/useReviewerTeams'

export function ReviewerSdg() {
  const { data: teams = [], isLoading } = useReviewerTeams()

  return (
    <ReviewerPageShell title="SDG Page" activeNav="sdg">
      {isLoading ? <TableSkeleton rows={8} /> : <TeamSdgOverviewPanel teams={teams} />}
    </ReviewerPageShell>
  )
}
