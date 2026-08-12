import { ReviewerPageShell } from '@/components/reviewer/ReviewerPageShell'
import { TeamPublicationsOverviewPanel } from '@/components/shared/TeamPublicationsOverviewPanel'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useReviewerTeams } from '@/hooks/useReviewerTeams'

export function ReviewerPublications() {
  const { data: teams = [], isLoading } = useReviewerTeams()

  return (
    <ReviewerPageShell title="Publications" activeNav="publications">
      {isLoading ? <TableSkeleton rows={8} /> : <TeamPublicationsOverviewPanel teams={teams} />}
    </ReviewerPageShell>
  )
}
