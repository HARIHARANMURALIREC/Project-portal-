import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { TeamSdgOverviewPanel } from '@/components/shared/TeamSdgOverviewPanel'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useQuery } from '@tanstack/react-query'
import { fetchAllCoordinatorTeams } from '@/lib/coordinatorData'

export function CoordinatorSdg() {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['coordinator-teams'],
    queryFn: fetchAllCoordinatorTeams,
  })

  return (
    <CoordinatorPageShell title="SDG Page" activeNav="sdg">
      {isLoading ? <TableSkeleton rows={8} /> : <TeamSdgOverviewPanel teams={teams} />}
    </CoordinatorPageShell>
  )
}
