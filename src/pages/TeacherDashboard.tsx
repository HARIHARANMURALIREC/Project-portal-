import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { TeamWithDetails } from '@/types/database'

function memberNames(team: TeamWithDetails): string {
  return team.team_members?.map((m) => m.name).join(', ') ?? '—'
}

function memberRegNos(team: TeamWithDetails): string {
  return team.team_members?.map((m) => m.reg_no).join(', ') ?? '—'
}

function formatSelectedAt(lockedAt: string | null): string {
  if (!lockedAt) return '—'
  return new Date(lockedAt).toLocaleString()
}

function TeamsTable({
  teams,
  variant,
}: {
  teams: TeamWithDetails[]
  variant: 'allocated' | 'pending'
}) {
  if (teams.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {variant === 'allocated'
          ? 'No project allocations yet.'
          : 'All eligible teams have selected a project.'}
      </p>
    )
  }

  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
        <thead className="sticky top-0 z-10 bg-white dark:bg-app-surface shadow-sm">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Team ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Names</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Reg No</th>
            {variant === 'allocated' && (
              <>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Domain</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Project</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Selected Date & Time</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {teams.map((team) => (
            <tr key={team.id} className="transition hover:bg-violet-50/50 dark:hover:bg-violet-950/30">
              <td className="px-4 py-3">
                <span className="rounded-md bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-800">
                  {team.batch_code}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{memberNames(team)}</td>
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{memberRegNos(team)}</td>
              {variant === 'allocated' && (
                <>
                  <td className="px-4 py-3 text-violet-700 dark:text-violet-300">{team.projects?.domain ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{team.projects?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatSelectedAt(team.locked_at)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Teams blocked by admin are hidden from the teacher dashboard. */
function isVisibleToTeacher(team: TeamWithDetails): boolean {
  return !team.selection_blocked
}

export function TeacherDashboard() {
  const { profile, signOut } = useAuth()

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teacher-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (id, reg_no, name),
          projects!teams_selected_project_id_fkey (id, title, domain, abstract),
          batches (id, name)
        `)
        .order('batch_id')
        .order('team_no')
      if (error) throw error
      return data as TeamWithDetails[]
    },
  })

  const visibleTeams = useMemo(() => teams.filter(isVisibleToTeacher), [teams])

  const allocatedTeams = useMemo(
    () => visibleTeams.filter((t) => t.selected_project_id && t.projects),
    [visibleTeams],
  )

  const teamsWithoutProjects = useMemo(
    () => visibleTeams.filter((t) => !t.selected_project_id),
    [visibleTeams],
  )

  const exportToExcel = () => {
    const allocationRows = allocatedTeams.map((team) => ({
      'Team ID': team.batch_code,
      Names: memberNames(team),
      'Reg No': memberRegNos(team),
      Domain: team.projects?.domain ?? '',
      Project: team.projects?.title ?? '',
      'Selected Date & Time': formatSelectedAt(team.locked_at),
    }))

    const pendingRows = teamsWithoutProjects.map((team) => ({
      'Team ID': team.batch_code,
      Names: memberNames(team),
      'Reg No': memberRegNos(team),
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocationRows), 'Project Allocation')
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(pendingRows),
      'Teams Without Projects',
    )
    XLSX.writeFile(wb, `teacher-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Export downloaded')
  }

  return (
    <Layout
      title="Teacher Dashboard"
      subtitle="Project allocation overview"
      userName={profile?.full_name ?? undefined}
      role="teacher"
      showLogo={false}
      onSignOut={signOut}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Card padding="sm" className="inline-flex items-center gap-2 border-violet-100 dark:border-violet-800 bg-white dark:bg-app-surface ring-1 ring-violet-50 dark:ring-violet-900">
            <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">{allocatedTeams.length}</span>
            <span className="text-sm text-violet-600 dark:text-violet-400">projects allocated</span>
          </Card>
          <Card padding="sm" className="inline-flex items-center gap-2 border-amber-100 bg-amber-50 dark:bg-amber-950/50">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{teamsWithoutProjects.length}</span>
            <span className="text-sm text-amber-700 dark:text-amber-300">teams without projects</span>
          </Card>
        </div>
        <Button onClick={exportToExcel} disabled={isLoading || visibleTeams.length === 0}>
          Export to Excel
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Table 1: Project Allocation</h2>
            <Card padding="none" className="overflow-hidden">
              <TeamsTable teams={allocatedTeams} variant="allocated" />
              <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-app-surface px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                {allocatedTeams.length} team(s) with projects
              </div>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Table 2: Teams Without Projects</h2>
            <Card padding="none" className="overflow-hidden">
              <TeamsTable teams={teamsWithoutProjects} variant="pending" />
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
