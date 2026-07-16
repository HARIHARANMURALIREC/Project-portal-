import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { MessageSquare } from 'lucide-react'
import { TeacherPageShell } from '@/components/teacher/TeacherPageShell'
import {
  AllocationTable,
  PendingTeamsTable,
  memberNames,
  memberRegNos,
} from '@/components/teacher/AllocationTable'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTeacherTeams } from '@/hooks/useTeacherTeams'
import { fetchCoordinatorRemarksForTeam, formatReviewDateTime } from '@/lib/reviews'

function TeacherDashboardContent() {
  const { data: teams = [], isLoading } = useTeacherTeams()

  const allocatedTeams = useMemo(
    () => teams.filter((t) => t.selected_project_id && t.projects),
    [teams],
  )

  const teamsWithoutProjects = useMemo(
    () => teams.filter((t) => !t.selected_project_id),
    [teams],
  )

  const teamIds = teams.map(t => t.id)
  const { data: allCoordinatorRemarks = [] } = useQuery({
    queryKey: ['coordinator-remarks-supervisor', teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return []
      const remarksPromises = teamIds.map(teamId => fetchCoordinatorRemarksForTeam(teamId))
      const results = await Promise.all(remarksPromises)
      return results.flat()
    },
    enabled: teamIds.length > 0,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  })

  const exportToExcel = () => {
    const allocationRows = allocatedTeams.map((team) => ({
      'Team ID': team.batch_code,
      Names: memberNames(team),
      'Reg No': memberRegNos(team),
      Domain: team.projects?.domain ?? '',
      Project: team.projects?.title ?? '',
    }))

    const pendingRows = teamsWithoutProjects.map((team) => ({
      'Team ID': team.batch_code,
      Names: memberNames(team),
      'Reg No': memberRegNos(team),
      Supervisor: team.supervisor_name ?? '',
      'Selection Blocked': team.selection_blocked ? 'Yes' : 'No',
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocationRows), 'Project Allocation')
    if (pendingRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendingRows), 'Teams Without Projects')
    }
    XLSX.writeFile(wb, `supervisor-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Export downloaded')
  }

  return (
    <>
      {allCoordinatorRemarks.length > 0 && (
        <Card padding="lg" className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 ring-1 ring-amber-50 dark:ring-amber-900">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Coordinator Notes</h3>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-app-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{allCoordinatorRemarks[0].review_title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatReviewDateTime(allCoordinatorRemarks[0].scheduled_at)}</p>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">{allCoordinatorRemarks[0].remarks}</p>
          </div>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Card padding="sm" className="inline-flex items-center gap-2 border-violet-100 dark:border-violet-800 bg-white dark:bg-app-surface ring-1 ring-violet-50 dark:ring-violet-900">
            <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">{allocatedTeams.length}</span>
            <span className="text-sm text-violet-600 dark:text-violet-400">projects allocated</span>
          </Card>
          <Card padding="sm" className="inline-flex items-center gap-2 border-amber-100 bg-amber-50 dark:bg-amber-950/50">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{teamsWithoutProjects.length}</span>
            <span className="text-sm text-amber-700 dark:text-amber-300">without projects</span>
          </Card>
        </div>
        <Button onClick={exportToExcel} disabled={isLoading || teams.length === 0}>
          Export to Excel
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Project Allocation</h2>
            <Card padding="none" className="overflow-hidden">
              <AllocationTable teams={allocatedTeams} />
              <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-app-surface px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                {allocatedTeams.length} team(s) with projects
              </div>
            </Card>
          </section>

          {teamsWithoutProjects.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Teams Without Projects</h2>
              <Card padding="none" className="overflow-hidden">
                <PendingTeamsTable
                  teams={teamsWithoutProjects}
                  showSupervisor={false}
                  showStatus
                />
                <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-app-surface px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                  {teamsWithoutProjects.length} team(s) including blocked teams under your supervision
                </div>
              </Card>
            </section>
          )}
        </div>
      )}
    </>
  )
}

export function TeacherDashboard() {
  return (
    <TeacherPageShell title="Dashboard" activeNav="dashboard">
      <TeacherDashboardContent />
    </TeacherPageShell>
  )
}
