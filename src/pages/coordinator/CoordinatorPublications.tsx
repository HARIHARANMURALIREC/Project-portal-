import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { TeamPublicationsOverviewPanel } from '@/components/shared/TeamPublicationsOverviewPanel'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useCoordinatorTeams } from '@/hooks/useCoordinatorTeams'

export function CoordinatorPublications() {
  const { data: teams = [], isLoading } = useCoordinatorTeams()

  return (
    <CoordinatorPageShell title="Publications" activeNav="publications">
      {isLoading ? <TableSkeleton rows={8} /> : <TeamPublicationsOverviewPanel teams={teams} />}
    </CoordinatorPageShell>
  )
}
