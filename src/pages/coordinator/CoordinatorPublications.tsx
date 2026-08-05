import { useQuery } from '@tanstack/react-query'
import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { TeamPublicationsOverviewPanel } from '@/components/shared/TeamPublicationsOverviewPanel'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { fetchAllCoordinatorTeams } from '@/lib/coordinatorData'

export function CoordinatorPublications() {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['coordinator-teams'],
    queryFn: fetchAllCoordinatorTeams,
  })

  return (
    <CoordinatorPageShell title="Publications" activeNav="publications">
      {isLoading ? <TableSkeleton rows={8} /> : <TeamPublicationsOverviewPanel teams={teams} />}
    </CoordinatorPageShell>
  )
}
