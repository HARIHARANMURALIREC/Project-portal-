import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { isLeadCoordinator } from '@/lib/teacherRoutes'
import { withSortedTeams } from '@/lib/teamSort'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  AllocationTable,
  PendingTeamsTable,
  memberNames,
  memberRegNos,
} from '@/components/teacher/AllocationTable'
import type { TeamWithDetails } from '@/types/database'

export function CoordinatorDashboard() {
  const { profile, signOut, loading: authLoading } = useAuth()

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['coordinator-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (id, reg_no, name),
          projects!teams_selected_project_id_fkey (id, title, domain, abstract),
          batches (id, name)
        `)
        .order('batch_id', { ascending: true })
        .order('team_no', { ascending: true })
      if (error) throw error
      return withSortedTeams((data ?? []) as TeamWithDetails[])
    },
  })

  const allocatedTeams = useMemo(
    () => teams.filter((t) => t.selected_project_id && t.projects),
    [teams],
  )

  const teamsWithoutProjects = useMemo(
    () => teams.filter((t) => !t.selected_project_id),
    [teams],
  )

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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendingRows), 'Teams Without Projects')
    XLSX.writeFile(wb, `coordinator-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Export downloaded')
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-app-black">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isLeadCoordinator(profile)) {
    return <Navigate to="/teacher" replace />
  }

  return (
    <Layout
      title="Coordinator Dashboard"
      subtitle="All teams · project allotment overview"
      userName={profile?.full_name ?? undefined}
      role="coordinator"
      showLogo={false}
      onSignOut={signOut}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Card padding="sm" className="inline-flex items-center gap-2 border-violet-100 dark:border-violet-800 bg-white dark:bg-app-surface ring-1 ring-violet-50 dark:ring-violet-900">
            <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">{allocatedTeams.length}</span>
            <span className="text-sm text-violet-600 dark:text-violet-400">projects allocated</span>
          </Card>
          <Card padding="sm" className="inline-flex items-center gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-app-surface">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{teams.length}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">total teams</span>
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
    </Layout>
  )
}
