import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
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
import { useAuth } from '@/hooks/useAuth'
import { useBatchTeams } from '@/hooks/useBatchTeams'
import { getBatchIdForCoordinator, getBatchLabel } from '@/lib/batchCoordinators'
import { BatchReviewSubmissions } from '@/components/teacher/BatchReviewSubmissions'

function TeacherBatchDashboardContent() {
  const { profile } = useAuth()
  const batchId = getBatchIdForCoordinator(profile)
  const { data: teams = [], isLoading } = useBatchTeams(batchId)

  const allocatedTeams = useMemo(
    () => teams.filter((t) => t.selected_project_id && t.projects),
    [teams],
  )

  const teamsWithoutProjects = useMemo(
    () => teams.filter((t) => !t.selected_project_id),
    [teams],
  )

  if (!batchId) {
    return <Navigate to="/teacher" replace />
  }

  const batchLabel = getBatchLabel(batchId)

  const exportToExcel = () => {
    const allocationRows = allocatedTeams.map((team) => ({
      'Team ID': team.batch_code,
      Names: memberNames(team),
      'Reg No': memberRegNos(team),
      Supervisor: team.supervisor_name ?? '',
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
    XLSX.writeFile(wb, `${batchLabel.replace(/\s+/g, '-')}-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Export downloaded')
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Card padding="sm" className="inline-flex items-center gap-2 border-violet-100 bg-white ring-1 ring-violet-50 dark:border-violet-800 dark:bg-app-surface dark:ring-violet-900">
            <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">{allocatedTeams.length}</span>
            <span className="text-sm text-violet-600 dark:text-violet-400">projects allocated</span>
          </Card>
          <Card padding="sm" className="inline-flex items-center gap-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-app-surface">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{teams.length}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">total teams in {batchLabel}</span>
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

      <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
        Section coordinator view for <span className="font-semibold">{batchLabel}</span> — all teams in this batch.
        Your own supervised teams stay on <span className="font-semibold">Dashboard</span> and <span className="font-semibold">Reviews</span>.
      </p>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {batchLabel} — Project Allocation
            </h2>
            <Card padding="none" className="overflow-hidden">
              <AllocationTable teams={allocatedTeams} showSupervisor />
              <div className="border-t border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-app-surface dark:text-slate-400">
                {allocatedTeams.length} team(s) with projects
              </div>
            </Card>
          </section>

          {teamsWithoutProjects.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {batchLabel} — Teams Without Projects
              </h2>
              <Card padding="none" className="overflow-hidden">
                <PendingTeamsTable teams={teamsWithoutProjects} showSupervisor showStatus />
                <div className="border-t border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-app-surface dark:text-slate-400">
                  {teamsWithoutProjects.length} team(s) pending
                </div>
              </Card>
            </section>
          )}

          <section>
            <BatchReviewSubmissions teams={teams} />
          </section>
        </div>
      )}
    </>
  )
}

export function TeacherBatchDashboard() {
  const { profile } = useAuth()
  const batchId = getBatchIdForCoordinator(profile)
  const title = batchId ? `${getBatchLabel(batchId)} Section` : 'Section'

  return (
    <TeacherPageShell title={title} activeNav="batch">
      <TeacherBatchDashboardContent />
    </TeacherPageShell>
  )
}
