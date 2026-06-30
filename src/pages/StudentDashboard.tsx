import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { StatusBadge } from '@/components/StatusBadge'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import type { Batch, Project, Team, TeamMember } from '@/types/database'

const PAGE_SIZE = 20

interface StudentContext {
  team: Team
  members: TeamMember[]
  batch: Batch
  selectedProject: Project | null
}

export function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [confirmProject, setConfirmProject] = useState<Project | null>(null)
  const [detailProject, setDetailProject] = useState<Project | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [optimisticLockedIds, setOptimisticLockedIds] = useState<Set<string>>(new Set())

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ['student-context', profile?.id],
    queryFn: async (): Promise<StudentContext | null> => {
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('*, teams (*, batches (*), projects!teams_selected_project_id_fkey (*))')
        .eq('user_id', profile!.id)
        .single()

      if (memberError || !member) {
        console.error('Student context error:', memberError)
        return null
      }

      const team = member.teams as Team & {
        batches: Batch
        projects: Project | null
      }

      const { data: members } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)

      return {
        team,
        members: members ?? [],
        batch: team.batches,
        selectedProject: team.projects,
      }
    },
    enabled: !!profile?.id,
  })

  const { data: domains = [] } = useQuery({
    queryKey: ['project-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('domain')
        .not('domain', 'is', null)
      if (error) throw error
      return [...new Set(data.map((p) => p.domain).filter(Boolean))].sort() as string[]
    },
    enabled: !!context && !context.selectedProject && context.batch.is_open,
  })

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', page, search, domainFilter],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*', { count: 'exact' })
        .order('s_no', { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (domainFilter) query = query.eq('domain', domainFilter)
      if (search) query = query.or(`title.ilike.%${search}%,abstract.ilike.%${search}%`)

      const { data, error, count } = await query
      if (error) throw error
      return { projects: data as Project[], total: count ?? 0 }
    },
    enabled: !!context && !context.selectedProject && context.batch.is_open,
  })

  useEffect(() => {
    const channel = supabase
      .channel('student-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, (payload) => {
        const updated = payload.new as Project
        if (updated.status === 'locked') {
          setOptimisticLockedIds((prev) => new Set(prev).add(updated.id))
        }
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'batches' }, () => {
        queryClient.invalidateQueries({ queryKey: ['student-context'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const totalPages = Math.ceil((projectsData?.total ?? 0) / PAGE_SIZE)

  const handleClaim = async () => {
    if (!confirmProject || !context) return
    setClaiming(true)
    setOptimisticLockedIds((prev) => new Set(prev).add(confirmProject.id))

    const { data, error } = await supabase.rpc('claim_project', {
      p_team_id: context.team.id,
      p_project_id: confirmProject.id,
    })

    if (error) {
      setOptimisticLockedIds((prev) => {
        const next = new Set(prev)
        next.delete(confirmProject.id)
        return next
      })
      toast.error(error.message)
    } else {
      const result = data?.[0]
      if (result?.success) {
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: ['student-context'] })
      } else {
        setOptimisticLockedIds((prev) => {
          const next = new Set(prev)
          next.delete(confirmProject.id)
          return next
        })
        toast.error(result?.message ?? 'Claim failed')
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    }

    setClaiming(false)
    setConfirmProject(null)
    setDetailProject(null)
  }

  const isProjectLocked = useMemo(
    () => (project: Project) => project.status === 'locked' || optimisticLockedIds.has(project.id),
    [optimisticLockedIds],
  )

  if (contextLoading) {
    return (
      <Layout title="Student Dashboard" onSignOut={signOut}>
        <div className="max-w-2xl"><CardSkeleton /></div>
      </Layout>
    )
  }

  if (!context) {
    return (
      <Layout title="Student Dashboard" userName={profile?.full_name ?? undefined} role="student" onSignOut={signOut}>
        <Card className="border-amber-200 bg-amber-50">
          <p className="font-semibold text-amber-900">Account not linked to a team</p>
          <p className="mt-1 text-sm text-amber-800">Contact your administrator to link your account.</p>
        </Card>
      </Layout>
    )
  }

  const { team, members, batch, selectedProject } = context

  return (
    <Layout
      title="Student Dashboard"
      subtitle={`Team ${team.batch_code} · ${batch.name}`}
      userName={profile?.full_name ?? undefined}
      role="student"
      onSignOut={signOut}
    >
      {/* Team info */}
      <Card className="mb-6 border-violet-100 bg-white ring-1 ring-violet-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Your Team</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center rounded-full bg-white px-3 py-1 text-sm shadow-sm ring-1 ring-slate-200"
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-1.5 text-slate-400">({m.reg_no})</span>
                </span>
              ))}
            </div>
            {team.supervisor_name && (
              <p className="mt-3 text-sm text-slate-600">
                Supervisor: <span className="font-medium">{team.supervisor_name}</span>
              </p>
            )}
          </div>
          <span className="rounded-lg bg-violet-600 px-3 py-1.5 font-mono text-sm font-bold text-white shadow-sm">
            {team.batch_code}
          </span>
        </div>
      </Card>

      {selectedProject ? (
        <Card className="border-2 border-emerald-200 bg-white">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge status="locked" label="Project Locked" />
            <span className="text-xs text-slate-500">
              {team.locked_at ? new Date(team.locked_at).toLocaleString() : ''}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{selectedProject.title}</h2>
          {selectedProject.domain && (
            <span className="mt-2 inline-block rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold text-violet-700">
              {selectedProject.domain}
            </span>
          )}
          {selectedProject.abstract && (
            <p className="mt-4 text-sm leading-relaxed text-slate-700">{selectedProject.abstract}</p>
          )}
          <p className="mt-4 rounded-lg bg-emerald-100/60 px-3 py-2 text-xs text-emerald-800">
            Your selection is final and cannot be changed.
          </p>
        </Card>
      ) : !batch.is_open ? (
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Selection not yet open</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Project selection for <strong>{batch.name}</strong> is currently closed. Check back when your admin opens the window.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mb-4" padding="md">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[200px] flex-1">
                <Input
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
              <Select
                value={domainFilter}
                onChange={(e) => { setDomainFilter(e.target.value); setPage(1) }}
                className="min-w-[160px]"
              >
                <option value="">All domains</option>
                {domains.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>
          </Card>

          <div className="space-y-3">
            {projectsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            ) : projectsData?.projects.length === 0 ? (
              <Card className="py-10 text-center text-sm text-slate-500">
                No projects match your filters.
              </Card>
            ) : (
              projectsData?.projects.map((project) => {
                const locked = isProjectLocked(project)
                return (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition ${
                      locked
                        ? 'border-slate-200 bg-white opacity-60'
                        : 'border-slate-200 hover:border-violet-200 hover:shadow-md hover:ring-1 hover:ring-violet-50'
                    }`}
                    onClick={() => setDetailProject(project)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {project.s_no != null && (
                            <span className="font-mono text-xs text-slate-400">#{project.s_no}</span>
                          )}
                          {project.domain && (
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                              {project.domain}
                            </span>
                          )}
                          {locked && <StatusBadge status="locked" />}
                        </div>
                        <h3 className="font-semibold text-slate-900">{project.title}</h3>
                        {project.abstract && (
                          <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{project.abstract}</p>
                        )}
                        <p className="mt-2 text-xs font-medium text-violet-600">Click to view full details</p>
                      </div>
                      {!locked && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmProject(project)
                          }}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-slate-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {detailProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setDetailProject(null)}
        >
          <Card
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto shadow-xl"
            padding="lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {detailProject.s_no != null && (
                  <span className="font-mono text-sm text-slate-500">#{detailProject.s_no}</span>
                )}
                {detailProject.domain && (
                  <span className="rounded-full bg-violet-50 px-3 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                    {detailProject.domain}
                  </span>
                )}
                {isProjectLocked(detailProject) ? (
                  <StatusBadge status="locked" />
                ) : (
                  <StatusBadge status="open" />
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetailProject(null)}>
                Close
              </Button>
            </div>

            <h3 className="text-lg font-bold leading-snug text-slate-900">{detailProject.title}</h3>

            <div className="mt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Abstract</h4>
              {detailProject.abstract ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {detailProject.abstract}
                </p>
              ) : (
                <p className="mt-2 text-sm italic text-slate-500">No abstract provided.</p>
              )}
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setDetailProject(null)}>
                Back to list
              </Button>
              {!isProjectLocked(detailProject) && (
                <Button
                  onClick={() => {
                    setConfirmProject(detailProject)
                    setDetailProject(null)
                  }}
                >
                  Select this project
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {confirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-xl" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Project Selection</h3>
            <p className="mt-2 text-sm font-medium text-violet-700 line-clamp-2">{confirmProject.title}</p>
            <p className="mt-3 text-sm text-slate-600">
              Are you sure? This cannot be undone. Once selected, your team cannot change their project.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmProject(null)}>
                Cancel
              </Button>
              <Button onClick={handleClaim} disabled={claiming}>
                {claiming ? 'Claiming…' : 'Yes, select this project'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  )
}
