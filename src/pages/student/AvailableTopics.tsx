import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, FolderKanban, Lock, Search, Sparkles } from 'lucide-react'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { getProjectDomains } from '@/lib/studentApi'
import { canSelectProject } from '@/lib/studentRules'
import type { Project } from '@/types/database'
import type { StudentContext } from '@/types/student'

function StudentModal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div className="w-full min-w-0 max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function AvailableTopicsContent({ context }: { context: StudentContext }) {
  const queryClient = useQueryClient()
  const { team, selectedProject, selectionBlocked } = context
  const selectionAllowed = canSelectProject(team, selectionBlocked)

  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [confirmProject, setConfirmProject] = useState<Project | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [optimisticLockedIds, setOptimisticLockedIds] = useState<Set<string>>(new Set())

  const { data: domains = [] } = useQuery({
    queryKey: ['project-domains'],
    queryFn: getProjectDomains,
    enabled: selectionAllowed && !selectedProject,
  })

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', search, domainFilter],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, s_no, title, domain, status')
        .order('s_no', { ascending: true })

      if (domainFilter) query = query.eq('domain', domainFilter)
      if (search) query = query.ilike('title', `%${search}%`)

      const { data, error } = await query
      if (error) throw error
      return data as Project[]
    },
    enabled: selectionAllowed && !selectedProject,
    refetchInterval: selectionAllowed && !selectedProject ? POLL_INTERVALS.projectsList : false,
    refetchOnWindowFocus: true,
  })

  const handleClaim = async () => {
    if (!confirmProject) return
    setClaiming(true)
    setOptimisticLockedIds((prev) => new Set(prev).add(confirmProject.id))

    const { data, error } = await supabase.rpc('claim_project', {
      p_team_id: team.id,
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
  }

  const isProjectLocked = useMemo(
    () => (project: Project) => project.status === 'locked' || optimisticLockedIds.has(project.id),
    [optimisticLockedIds],
  )

  const projectStats = useMemo(() => {
    const available = projects.filter((p) => !isProjectLocked(p)).length
    const taken = projects.length - available
    return { total: projects.length, available, taken }
  }, [projects, isProjectLocked])

  if (!selectionAllowed || selectedProject) {
    return <Navigate to="/student/my-project" replace />
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-primary-700 p-5 text-white shadow-lg ring-1 ring-violet-500/20 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-violet-100">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Project selection open</span>
            </div>
            <h2 className="text-xl font-bold sm:text-2xl">Available Topics</h2>
            <p className="mt-2 text-sm text-violet-100">
              Team <span className="font-semibold text-white">{team.batch_code}</span> — pick one project.
              Selection is final.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <div className="rounded-lg bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold">{projectStats.available}</p>
              <p className="text-xs text-violet-100">Open</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-2 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold">{projectStats.taken}</p>
              <p className="text-xs text-violet-100">Taken</p>
            </div>
          </div>
        </div>
      </div>

      <Card padding="md" className="border-violet-100 ring-1 ring-violet-50 dark:border-violet-800 dark:ring-violet-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by project title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="w-full min-w-0 sm:w-auto sm:min-w-[160px]"
          >
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </div>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {projectsLoading ? 'Loading projects…' : `${projectStats.total} project${projectStats.total === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-slate-200 py-16 text-center dark:border-slate-700">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700 dark:text-slate-200">No projects found</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try a different search or domain filter.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const locked = isProjectLocked(project)
              return (
                <Card
                  key={project.id}
                  padding="md"
                  className={`flex h-full flex-col border-slate-200 transition dark:border-slate-700 ${
                    locked
                      ? 'bg-slate-50/80 opacity-75 dark:bg-app-black/30'
                      : 'hover:border-violet-300 hover:shadow-md hover:ring-2 hover:ring-violet-100 dark:hover:border-violet-700 dark:hover:ring-violet-900/50'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    {project.s_no != null && (
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${
                          locked
                            ? 'bg-slate-200 text-slate-500 dark:bg-neutral-800 dark:text-slate-400'
                            : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
                        }`}
                      >
                        {project.s_no}
                      </span>
                    )}
                    {locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-neutral-800 dark:text-slate-400">
                        <Lock className="h-3 w-3" />
                        Taken
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Open
                      </span>
                    )}
                  </div>

                  <h3
                    className={`mb-4 min-h-[3.5rem] flex-1 break-words text-sm font-semibold leading-snug ${
                      locked
                        ? 'text-slate-500 line-through decoration-slate-300 dark:text-slate-500'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {project.title}
                  </h3>

                  {!locked ? (
                    <Button
                      size="sm"
                      fullWidth
                      onClick={() => setConfirmProject(project)}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Select
                    </Button>
                  ) : (
                    <div className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 py-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-neutral-900 dark:text-slate-400">
                      <Lock className="h-3.5 w-3.5" />
                      Unavailable
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {confirmProject && (
        <StudentModal onClose={() => setConfirmProject(null)}>
          <Card
            className="w-full min-w-0 overflow-x-hidden rounded-b-none border-violet-200 shadow-xl dark:border-violet-800 sm:rounded-xl"
            padding="lg"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/60">
              <CheckCircle2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirm selection</h3>
            <p className="mt-3 break-words rounded-lg bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
              {confirmProject.title}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              This choice is <strong>final</strong>. Your team cannot change the project after confirming.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setConfirmProject(null)}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleClaim} disabled={claiming}>
                {claiming ? 'Claiming…' : 'Confirm selection'}
              </Button>
            </div>
          </Card>
        </StudentModal>
      )}
    </div>
  )
}

export function AvailableTopics() {
  return (
    <StudentPageShell title="Available Topics" activeNav="topics">
      {(context) => <AvailableTopicsContent context={context} />}
    </StudentPageShell>
  )
}
