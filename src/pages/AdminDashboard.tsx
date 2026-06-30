import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { StatusBadge } from '@/components/StatusBadge'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import type { Batch, TeamWithDetails } from '@/types/database'

const batchIcons: Record<string, string> = { A: 'A', B: 'B', C: 'C', D: 'D' }

export function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [batchFilter, setBatchFilter] = useState('')
  const [supervisorFilter, setSupervisorFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [search, setSearch] = useState('')
  const [unlockTeamId, setUnlockTeamId] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)

  const { data: batches = [], isLoading: batchesLoading } = useQuery({
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
  })

  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
        queryClient.invalidateQueries({ queryKey: ['batches'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

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
    }
  }, [teams])

  const supervisors = useMemo(
    () => [...new Set(teams.map((t) => t.supervisor_name).filter(Boolean))].sort() as string[],
    [teams],
  )

  const domains = useMemo(
    () => [...new Set(teams.map((t) => t.projects?.domain).filter(Boolean))].sort() as string[],
    [teams],
  )

  const toggleBatch = useCallback(async (batch: Batch) => {
    const newOpen = !batch.is_open
    const { error } = await supabase
      .from('batches')
      .update({
        is_open: newOpen,
        opened_at: newOpen ? new Date().toISOString() : batch.opened_at,
        closed_at: newOpen ? null : new Date().toISOString(),
      })
      .eq('id', batch.id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Batch ${batch.name} ${newOpen ? 'opened' : 'closed'}`)
    queryClient.invalidateQueries({ queryKey: ['batches'] })
  }, [queryClient])

  const handleForceUnlock = async () => {
    if (!unlockTeamId) return
    setUnlocking(true)
    const { data, error } = await supabase.rpc('admin_force_unlock', { p_team_id: unlockTeamId })

    if (error) {
      toast.error(error.message)
    } else {
      const result = data?.[0]
      if (result?.success) {
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      } else {
        toast.error(result?.message ?? 'Unlock failed')
      }
    }

    setUnlocking(false)
    setUnlockTeamId(null)
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
      subtitle="Manage batch selection windows and monitor team allotments"
      userName={profile?.full_name ?? undefined}
      role="admin"
      onSignOut={signOut}
    >
      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Teams" value={stats.total} accent="primary" />
        <StatCard label="Projects Selected" value={stats.selected} accent="success" />
        <StatCard label="Pending" value={stats.pending} accent="warning" />
      </div>

      {/* Batch toggles */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Batch Selection Control</h2>
        {batchesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {batches.map((batch) => (
              <Card
                key={batch.id}
                className={`transition ${batch.is_open ? 'border-emerald-200 ring-1 ring-emerald-100' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${
                        batch.is_open
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {batchIcons[batch.id] ?? batch.id}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{batch.name}</p>
                      <StatusBadge
                        status={batch.is_open ? 'open' : 'locked'}
                        label={batch.is_open ? 'Open' : 'Closed'}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => toggleBatch(batch)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      batch.is_open ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    aria-label={`Toggle ${batch.name}`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                        batch.is_open ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

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

      {/* Teams table */}
      <Card padding="none" className="overflow-hidden">
        <div className="max-h-[32rem] overflow-auto">
          {teamsLoading ? (
            <div className="p-4"><TableSkeleton rows={8} /></div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Batch</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Team</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Members</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Supervisor</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Project</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Locked</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.map((team, idx) => (
                  <tr
                    key={team.id}
                    className={`transition hover:bg-violet-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-white'}`}
                  >
                    <td className="px-4 py-3">{team.batches?.name ?? team.batch_id}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-violet-50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                        {team.batch_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {team.team_members?.map((m) => (
                        <div key={m.id} className="text-xs">
                          {m.name} <span className="text-slate-400">({m.reg_no})</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{team.supervisor_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {team.projects ? (
                        <div>
                          <p className="font-medium line-clamp-1">{team.projects.title}</p>
                          {team.projects.domain && (
                            <p className="text-xs text-violet-600">{team.projects.domain}</p>
                          )}
                        </div>
                      ) : (
                        <StatusBadge status="pending" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {team.locked_at ? new Date(team.locked_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {team.selected_project_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUnlockTeamId(team.id)}
                          className="!text-red-600 hover:!bg-red-50"
                        >
                          Force unlock
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!teamsLoading && (
          <div className="border-t border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-500">
            Showing {filteredTeams.length} of {teams.length} teams
          </div>
        )}
      </Card>

      {/* Unlock confirmation modal */}
      {unlockTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-xl" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900">Force Unlock Team</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will clear the team&apos;s project selection and reopen the project for other teams.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setUnlockTeamId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleForceUnlock} disabled={unlocking}>
                {unlocking ? 'Unlocking…' : 'Confirm unlock'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  )
}
