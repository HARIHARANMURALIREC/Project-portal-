import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { StatusBadge } from '@/components/StatusBadge'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import type { Batch, PortalSettings, TeamWithDetails } from '@/types/database'

export function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [batchFilter, setBatchFilter] = useState('')
  const [supervisorFilter, setSupervisorFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [search, setSearch] = useState('')
  const [confirmUnlockAll, setConfirmUnlockAll] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [togglingSelection, setTogglingSelection] = useState(false)
  const [togglingPortal, setTogglingPortal] = useState(false)
  const [togglingTeamId, setTogglingTeamId] = useState<string | null>(null)

  const { data: portalSettings } = useQuery({
    queryKey: ['portal-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('id', 1)
        .single()
      if (error) throw error
      return data as PortalSettings
    },
    refetchInterval: POLL_INTERVALS.adminData,
    refetchOnWindowFocus: true,
  })

  const selectionBlocked = portalSettings?.selection_blocked ?? false
  const portalOpen = portalSettings?.portal_open ?? true

  const { data: batches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('batches').select('*').order('id')
      if (error) throw error
      return data as Batch[]
    },
  })

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['admin-teams'],
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
    refetchInterval: POLL_INTERVALS.adminData,
    refetchOnWindowFocus: true,
  })

  const blockedTeams = useMemo(
    () => teams.filter((team) => team.selection_blocked),
    [teams],
  )

  const teamsWithSelection = useMemo(
    () => teams.filter((team) => team.selected_project_id),
    [teams],
  )

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (batchFilter && team.batch_id !== batchFilter) return false
      if (supervisorFilter && team.supervisor_name !== supervisorFilter) return false
      if (domainFilter && team.projects?.domain !== domainFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const memberMatch = team.team_members?.some(
          (m) => m.name.toLowerCase().includes(q) || m.reg_no.toLowerCase().includes(q),
        )
        const projectMatch = team.projects?.title?.toLowerCase().includes(q)
        const codeMatch = team.batch_code.toLowerCase().includes(q)
        if (!memberMatch && !projectMatch && !codeMatch) return false
      }
      return true
    })
  }, [teams, batchFilter, supervisorFilter, domainFilter, search])

  const stats = useMemo(() => {
    const selected = teams.filter((t) => t.selected_project_id).length
    return {
      total: teams.length,
      selected,
      pending: teams.length - selected,
      blocked: blockedTeams.length,
    }
  }, [teams, blockedTeams])

  const supervisors = useMemo(
    () => [...new Set(teams.map((t) => t.supervisor_name).filter(Boolean))].sort() as string[],
    [teams],
  )

  const domains = useMemo(
    () => [...new Set(teams.map((t) => t.projects?.domain).filter(Boolean))].sort() as string[],
    [teams],
  )

  const handleForceUnlockAll = async () => {
    if (teamsWithSelection.length === 0) return
    setUnlocking(true)

    let succeeded = 0
    let failed = 0
    for (const team of teamsWithSelection) {
      const { data, error } = await supabase.rpc('admin_force_unlock', { p_team_id: team.id })
      if (error || !data?.[0]?.success) {
        failed += 1
      } else {
        succeeded += 1
      }
    }

    if (failed === 0) {
      toast.success(`Unlocked ${succeeded} team${succeeded === 1 ? '' : 's'}`)
    } else if (succeeded === 0) {
      toast.error('Failed to unlock teams')
    } else {
      toast.error(`Unlocked ${succeeded}; ${failed} failed`)
    }

    if (succeeded > 0) {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['student-context'] })
    }

    setUnlocking(false)
    setConfirmUnlockAll(false)
  }

  const handleTogglePortalOpen = async () => {
    setTogglingPortal(true)
    const nextOpen = !portalOpen
    const { error } = await supabase
      .from('portal_settings')
      .update({
        portal_open: nextOpen,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(
        nextOpen
          ? 'Portal opened — students can sign in'
          : 'Portal closed — students cannot access the portal',
      )
      queryClient.invalidateQueries({ queryKey: ['portal-settings'] })
      queryClient.invalidateQueries({ queryKey: ['portal-status'] })
    }
    setTogglingPortal(false)
  }

  const handleToggleSelectionBlock = async () => {
    setTogglingSelection(true)
    const nextBlocked = !selectionBlocked
    const { error } = await supabase
      .from('portal_settings')
      .update({
        selection_blocked: nextBlocked,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(
        nextBlocked
          ? 'Project selection blocked for all teams'
          : 'Project selection opened for all teams',
      )
      queryClient.invalidateQueries({ queryKey: ['portal-settings'] })
      queryClient.invalidateQueries({ queryKey: ['student-context'] })
    }
    setTogglingSelection(false)
  }

  const handleToggleTeamSelectionBlock = async (team: TeamWithDetails) => {
    setTogglingTeamId(team.id)
    const nextBlocked = !team.selection_blocked
    const { error } = await supabase
      .from('teams')
      .update({ selection_blocked: nextBlocked })
      .eq('id', team.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(
        nextBlocked
          ? `Selection blocked for ${team.batch_code}`
          : `Selection opened for ${team.batch_code}`,
      )
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      queryClient.invalidateQueries({ queryKey: ['student-context'] })
    }
    setTogglingTeamId(null)
  }

  const exportToExcel = () => {
    const rows = teams.map((team) => ({
      Batch: team.batches?.name ?? team.batch_id,
      'Team No': team.team_no,
      'Batch Code': team.batch_code,
      Members: team.team_members?.map((m) => `${m.name} (${m.reg_no})`).join(', ') ?? '',
      Supervisor: team.supervisor_name ?? '',
      'Project Title': team.projects?.title ?? 'Pending',
      Domain: team.projects?.domain ?? '',
      'Selection Blocked': team.selection_blocked ? 'Yes' : 'No',
      'Locked At': team.locked_at ? new Date(team.locked_at).toLocaleString() : '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Allotments')
    XLSX.writeFile(wb, `project-allotments-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Export downloaded')
  }

  return (
    <Layout
      title="Admin Dashboard"
      subtitle="Monitor team allotments and project selections"
      userName={profile?.full_name ?? undefined}
      role="admin"
      onSignOut={signOut}
    >
      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Teams" value={stats.total} accent="primary" />
        <StatCard label="Projects Selected" value={stats.selected} accent="success" />
        <StatCard label="Pending" value={stats.pending} accent="warning" />
        <StatCard label="Teams Blocked" value={stats.blocked} accent="danger" />
      </div>

      {/* Portal access control */}
      <Card className="mb-8" padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Portal Access</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Open or close the portal for students. Admins and teachers can always sign in.
            </p>
            <div className="mt-3">
              <StatusBadge status={portalOpen ? 'open' : 'locked'} label={portalOpen ? 'Open' : 'Closed'} />
            </div>
          </div>
          <Button
            variant={portalOpen ? 'danger' : 'primary'}
            onClick={handleTogglePortalOpen}
            disabled={togglingPortal || !portalSettings}
          >
            {togglingPortal
              ? 'Updating…'
              : portalOpen
                ? 'Close portal for students'
                : 'Open portal for students'}
          </Button>
        </div>
      </Card>

      {/* Global selection control */}
      <Card className="mb-8" padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project Selection Control</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Block or allow project selection for every team at once.
            </p>
            <div className="mt-3">
              <StatusBadge status={selectionBlocked ? 'locked' : 'open'} />
            </div>
          </div>
          <Button
            variant={selectionBlocked ? 'primary' : 'secondary'}
            onClick={handleToggleSelectionBlock}
            disabled={togglingSelection || !portalSettings}
          >
            {togglingSelection
              ? 'Updating…'
              : selectionBlocked
                ? 'Open selection for all teams'
                : 'Block selection for all teams'}
          </Button>
        </div>
      </Card>

      {/* Force unlock all */}
      <Card className="mb-8" padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Force Unlock All Teams</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Clear every team&apos;s project selection and reopen those projects for selection again.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {teamsWithSelection.length} team{teamsWithSelection.length === 1 ? '' : 's'} currently selected
            </p>
          </div>
          <Button
            variant="danger"
            onClick={() => setConfirmUnlockAll(true)}
            disabled={unlocking || teamsLoading || teamsWithSelection.length === 0}
          >
            Force unlock all
          </Button>
        </div>
      </Card>

      {/* Blocked teams */}
      <Card className="mb-8" padding="none">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Blocked Teams</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Teams individually blocked from project selection.
              </p>
            </div>
            <StatusBadge status={blockedTeams.length > 0 ? 'locked' : 'open'} />
          </div>
        </div>
        <div className="max-h-72 overflow-auto">
          {teamsLoading ? (
            <div className="p-4"><TableSkeleton rows={3} /></div>
          ) : blockedTeams.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No teams are individually blocked.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="sticky top-0 z-10 bg-red-50/90 dark:bg-red-950/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Batch</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Team</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Members</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Supervisor</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Project</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {blockedTeams.map((team) => (
                  <tr key={team.id} className="bg-white dark:bg-app-surface">
                    <td className="px-4 py-3">{team.batches?.name ?? team.batch_id}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-red-50 px-2 py-0.5 font-mono text-xs font-semibold text-red-700 ring-1 ring-red-100 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900">
                        {team.batch_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {team.team_members?.map((m) => (
                        <div key={m.id} className="text-xs">
                          {m.name} <span className="text-slate-400 dark:text-slate-500">({m.reg_no})</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{team.supervisor_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {team.projects ? (
                        <p className="font-medium line-clamp-1">{team.projects.title}</p>
                      ) : (
                        <StatusBadge status="pending" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!team.selected_project_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleTeamSelectionBlock(team)}
                          disabled={togglingTeamId === team.id || selectionBlocked}
                          className="!text-emerald-600 dark:text-emerald-400 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/50"
                          title={
                            selectionBlocked
                              ? 'Global selection is blocked — open it first'
                              : undefined
                          }
                        >
                          {togglingTeamId === team.id ? 'Updating…' : 'Allow selection'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!teamsLoading && blockedTeams.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-app-surface px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
            {blockedTeams.length} blocked team{blockedTeams.length === 1 ? '' : 's'}
          </div>
        )}
      </Card>

      {/* Filters + export */}
      <Card className="mb-4" padding="md">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Select
            label="Supervisor"
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
          >
            <option value="">All supervisors</option>
            {supervisors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select label="Domain" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
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
          <Button onClick={exportToExcel}>Export to Excel</Button>
        </div>
      </Card>

      {/* All teams table */}
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">All Teams</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Full allotment list with filters and per-team controls.
        </p>
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="max-h-[32rem] overflow-auto">
          {teamsLoading ? (
            <div className="p-4"><TableSkeleton rows={8} /></div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="sticky top-0 z-10 bg-white dark:bg-app-surface shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Batch</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Team</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Members</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Supervisor</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Project</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Selection</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Locked</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeams.map((team, idx) => (
                  <tr
                    key={team.id}
                    className={`transition hover:bg-violet-50/50 dark:hover:bg-violet-950/30 ${idx % 2 === 0 ? 'bg-white dark:bg-app-surface' : 'bg-white dark:bg-app-surface'}`}
                  >
                    <td className="px-4 py-3">{team.batches?.name ?? team.batch_id}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-800">
                        {team.batch_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {team.team_members?.map((m) => (
                        <div key={m.id} className="text-xs">
                          {m.name} <span className="text-slate-400 dark:text-slate-500">({m.reg_no})</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{team.supervisor_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {team.projects ? (
                        <div>
                          <p className="font-medium line-clamp-1">{team.projects.title}</p>
                          {team.projects.domain && (
                            <p className="text-xs text-violet-600 dark:text-violet-400">{team.projects.domain}</p>
                          )}
                        </div>
                      ) : (
                        <StatusBadge status="pending" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {team.selected_project_id ? (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      ) : selectionBlocked ? (
                        <StatusBadge status="locked" />
                      ) : team.selection_blocked ? (
                        <StatusBadge status="locked" />
                      ) : (
                        <StatusBadge status="open" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {team.locked_at ? new Date(team.locked_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {!team.selected_project_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleTeamSelectionBlock(team)}
                            disabled={togglingTeamId === team.id || selectionBlocked}
                            className={
                              team.selection_blocked
                                ? '!text-emerald-600 dark:text-emerald-400 hover:!bg-emerald-50 dark:bg-emerald-950/50'
                                : '!text-amber-700 dark:text-amber-300 hover:!bg-amber-50 dark:bg-amber-950/50'
                            }
                            title={
                              selectionBlocked
                                ? 'Global selection is blocked — open it first'
                                : undefined
                            }
                          >
                            {togglingTeamId === team.id
                              ? 'Updating…'
                              : team.selection_blocked
                                ? 'Allow selection'
                                : 'Block selection'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!teamsLoading && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-app-surface px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredTeams.length} of {teams.length} teams
          </div>
        )}
      </Card>

      {/* Unlock all confirmation modal */}
      {confirmUnlockAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-xl" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Force Unlock All Teams</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This will clear project selections for{' '}
              <strong>{teamsWithSelection.length}</strong> team{teamsWithSelection.length === 1 ? '' : 's'} and reopen
              those projects. This cannot be undone.
            </p>
            <ul className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-app-black">
              {teamsWithSelection.map((team) => (
                <li key={team.id} className="py-1 text-slate-700 dark:text-slate-300">
                  <span className="font-mono font-semibold">{team.batch_code}</span>
                  {team.projects?.title ? ` — ${team.projects.title}` : ''}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmUnlockAll(false)} disabled={unlocking}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleForceUnlockAll} disabled={unlocking}>
                {unlocking ? 'Unlocking…' : 'Confirm unlock all'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  )
}
