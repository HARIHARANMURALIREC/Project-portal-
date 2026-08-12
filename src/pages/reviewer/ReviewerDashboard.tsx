import { ReviewerPageShell } from '@/components/reviewer/ReviewerPageShell'
import { AllocationTable, memberNames, memberRegNos } from '@/components/teacher/AllocationTable'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useReviewerTeams } from '@/hooks/useReviewerTeams'
import { getSectionReviewerLabel } from '@/lib/sectionReviewers'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

function ReviewerDashboardContent() {
  const { profile } = useAuth()
  const { data: teams = [], isLoading } = useReviewerTeams()
  const sectionLabel = getSectionReviewerLabel(profile)

  const exportToExcel = () => {
    const rows = teams.map((team) => ({
      'Team ID': team.batch_code,
      Batch: team.batches?.name ?? team.batch_id,
      Names: memberNames(team),
      'Reg No': memberRegNos(team),
      Supervisor: team.supervisor_name ?? '',
      Reviewer: team.reviewer_name ?? '',
      'Project Title': team.projects?.title ?? '',
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Teams')
    XLSX.writeFile(wb, `reviewer-${sectionLabel.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Export downloaded')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {sectionLabel} teams
          {!isLoading && (
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
              ({teams.length})
            </span>
          )}
        </h2>
        <Button size="sm" variant="secondary" onClick={exportToExcel} disabled={teams.length === 0}>
          Export Excel
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : teams.length === 0 ? (
        <Card padding="lg" className="text-center text-sm text-slate-500 dark:text-slate-400">
          No teams found for {sectionLabel}.
        </Card>
      ) : (
        <Card padding="none" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AllocationTable
            teams={teams}
            showSupervisor
            fillHeight
            emptyMessage={`No teams found for ${sectionLabel}.`}
          />
        </Card>
      )}
    </div>
  )
}

export function ReviewerDashboard() {
  return (
    <ReviewerPageShell title="Dashboard" activeNav="dashboard">
      <ReviewerDashboardContent />
    </ReviewerPageShell>
  )
}
