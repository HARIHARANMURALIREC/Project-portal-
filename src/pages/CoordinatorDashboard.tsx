import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import {
  AllocationTable,
  PendingTeamsTable,
  memberNames,
  memberRegNos,
} from '@/components/teacher/AllocationTable'
import { CoordinatorReviewScheduler } from '@/components/coordinator/CoordinatorReviewScheduler'
import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { fetchAllCoordinatorTeams } from '@/lib/coordinatorData'
import { useAuth } from '@/hooks/useAuth'
import { getBatchLabel, getBatchIdForCoordinator } from '@/lib/batchCoordinators'
import { isLeadCoordinator } from '@/lib/teacherRoutes'
import { teamBatchOptions, teamMatchesFilters, uniqueSorted } from '@/lib/teamFilters'
import type { TeamWithDetails } from '@/types/database'

export function CoordinatorDashboard() {
  const { profile } = useAuth()
  const isLead = isLeadCoordinator(profile)
  const batchId = getBatchIdForCoordinator(profile)
  const [batchFilter, setBatchFilter] = useState('')
  const [supervisorFilter, setSupervisorFilter] = useState('')
  const [reviewerFilter, setReviewerFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['coordinator-teams'],
    queryFn: fetchAllCoordinatorTeams,
  })

  const batches = useMemo(() => teamBatchOptions(teams), [teams])
  const supervisors = useMemo(() => uniqueSorted(teams.map((t) => t.supervisor_name)), [teams])
  const reviewers = useMemo(() => uniqueSorted(teams.map((t) => t.reviewer_name)), [teams])
  const domains = useMemo(() => uniqueSorted(teams.map((t) => t.projects?.domain)), [teams])

  const filteredTeams = useMemo(
    () =>
      teams.filter((team) =>
        teamMatchesFilters(team, {
          batchId: batchFilter,
          supervisor: supervisorFilter,
          reviewer: reviewerFilter,
          domain: domainFilter,
          search,
        }),
      ),
    [teams, batchFilter, supervisorFilter, reviewerFilter, domainFilter, search],
  )

  const allocatedTeams = useMemo(
    () => filteredTeams.filter((t) => t.selected_project_id && t.projects),
    [filteredTeams],
  )

  const teamsWithoutProjects = useMemo(
    () => filteredTeams.filter((t) => !t.selected_project_id),
    [filteredTeams],
  )

  const clearFilters = () => {
    setBatchFilter('')
    setSupervisorFilter('')
    setReviewerFilter('')
    setDomainFilter('')
    setSearch('')
  }

  const exportToExcel = () => {
    const allocationRows = allocatedTeams.map((team: TeamWithDetails) => ({
      'Team ID': team.batch_code,
      Names: memberNames(team),
      'Reg No': memberRegNos(team),
      Supervisor: team.supervisor_name ?? '',
      Reviewer: team.reviewer_name ?? '',
      Domain: team.projects?.domain ?? '',
      Project: team.projects?.title ?? '',
    }))

    const pendingRows = teamsWithoutProjects.map((team: TeamWithDetails) => ({
      'Team ID': team.batch_code,
      Names: memberNames(team),
      'Reg No': memberRegNos(team),
      Supervisor: team.supervisor_name ?? '',
      Reviewer: team.reviewer_name ?? '',
      'Selection Blocked': team.selection_blocked ? 'Yes' : 'No',
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocationRows), 'Project Allocation')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendingRows), 'Teams Without Projects')
    XLSX.writeFile(wb, `coordinator-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Export downloaded')
  }

  return (
    <CoordinatorPageShell title="Coordinator Dashboard" activeNav="overview">
      {!isLead && batchId && (
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Section view for <span className="font-semibold">{getBatchLabel(batchId)}</span> — same
          Dashboard, Uploads, and Marks pages as the lead coordinator.
        </p>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Card padding="sm" className="inline-flex items-center gap-2 border-violet-100 dark:border-violet-800 bg-white dark:bg-app-surface ring-1 ring-violet-50 dark:ring-violet-900">
            <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">{allocatedTeams.length}</span>
            <span className="text-sm text-violet-600 dark:text-violet-400">projects allocated</span>
          </Card>
          <Card padding="sm" className="inline-flex items-center gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-app-surface">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{filteredTeams.length}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {filteredTeams.length === teams.length ? 'total teams' : `of ${teams.length} teams`}
            </span>
          </Card>
          <Card padding="sm" className="inline-flex items-center gap-2 border-amber-100 bg-amber-50 dark:bg-amber-950/50">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{teamsWithoutProjects.length}</span>
            <span className="text-sm text-amber-700 dark:text-amber-300">without projects</span>
          </Card>
        </div>
        <Button onClick={exportToExcel} disabled={isLoading || filteredTeams.length === 0}>
          Export to Excel
        </Button>
      </div>

      <Card className="mb-6" padding="md">
        <div className="flex flex-wrap items-end gap-3">
          {isLead && (
            <Select label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
              <option value="">All batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          )}
          <Select
            label="Supervisor"
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
          >
            <option value="">All supervisors</option>
            {supervisors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Reviewer"
            value={reviewerFilter}
            onChange={(e) => setReviewerFilter(e.target.value)}
          >
            <option value="">All reviewers</option>
            {reviewers.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select label="Domain" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Team code, member, project…"
            />
          </div>
          <Button variant="secondary" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </Card>

      {isLead ? (
        <section className="mb-8">
          <CoordinatorReviewScheduler />
        </section>
      ) : (
        <Card className="mb-8" padding="md">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Common review dates are set by the lead coordinator. You can view uploads and marks for
            your section on the Uploads and Marks pages.
          </p>
        </Card>
      )}

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Project Allocation</h2>
            <Card padding="none" className="overflow-hidden">
              <AllocationTable teams={allocatedTeams} showSupervisor />
              <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-app-surface px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                {allocatedTeams.length} team(s) with projects
              </div>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Teams Without Projects</h2>
            <Card padding="none" className="overflow-hidden">
              <PendingTeamsTable teams={teamsWithoutProjects} showStatus />
              <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-app-surface px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                {teamsWithoutProjects.length} team(s) pending selection
              </div>
            </Card>
          </section>
        </div>
      )}
    </CoordinatorPageShell>
  )
}
