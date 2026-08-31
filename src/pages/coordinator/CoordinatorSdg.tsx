import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { TeamSdgOverviewPanel } from '@/components/shared/TeamSdgOverviewPanel'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useCoordinatorTeams } from '@/hooks/useCoordinatorTeams'

export function CoordinatorSdg() {
  const { data: teams = [], isLoading } = useCoordinatorTeams()

  return (
    <CoordinatorPageShell title="SDG Page" activeNav="sdg">
      {isLoading ? <TableSkeleton rows={8} /> : <TeamSdgOverviewPanel teams={teams} />}
    </CoordinatorPageShell>
  )
}
