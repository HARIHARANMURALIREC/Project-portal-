import { TeacherPageShell } from '@/components/teacher/TeacherPageShell'
import { TeamSdgOverviewPanel } from '@/components/shared/TeamSdgOverviewPanel'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useTeacherTeams } from '@/hooks/useTeacherTeams'
import { useReviewerTeams } from '@/hooks/useReviewerTeams'
import { useMemo } from 'react'

export function TeacherSdg() {
  const { data: supervised = [], isLoading: supLoading } = useTeacherTeams()
  const { data: reviewed = [], isLoading: revLoading } = useReviewerTeams()

  const teams = useMemo(() => {
    const map = new Map(supervised.map((t) => [t.id, t]))
    for (const t of reviewed) {
      if (!map.has(t.id)) map.set(t.id, t)
    }
    return Array.from(map.values())
  }, [supervised, reviewed])

  return (
    <TeacherPageShell title="SDG Page" activeNav="sdg">
      {supLoading || revLoading ? <TableSkeleton rows={8} /> : <TeamSdgOverviewPanel teams={teams} />}
    </TeacherPageShell>
  )
}
