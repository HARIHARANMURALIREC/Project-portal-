import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { notifySelectionEmail } from '@/lib/selectionEmailNotify'
import { supabase } from '@/lib/supabase'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { getProjectDomains } from '@/lib/studentApi'
import { canSelectProject } from '@/lib/studentRules'
import type { Project } from '@/types/database'
import type { StudentContext } from '@/types/student'

const PAGE_SIZE = 20

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

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [confirmProject, setConfirmProject] = useState<Project | null>(null)
  const [detailProject, setDetailProject] = useState<Project | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [optimisticLockedIds, setOptimisticLockedIds] = useState<Set<string>>(new Set())

  const { data: domains = [] } = useQuery({
    queryKey: ['project-domains'],
    queryFn: getProjectDomains,
    enabled: selectionAllowed && !selectedProject,
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
    enabled: selectionAllowed && !selectedProject,
    refetchInterval: selectionAllowed && !selectedProject ? POLL_INTERVALS.projectsList : false,
    refetchOnWindowFocus: true,
  })

  const totalPages = Math.ceil((projectsData?.total ?? 0) / PAGE_SIZE)

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
        notifySelectionEmail(team.id)
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

  if (!selectionAllowed || selectedProject) {
    return <Navigate to="/student/my-project" replace />
  }

  return (
    <>
      <Card className="mb-4 border-slate-200 dark:border-slate-700" padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="min-w-0 flex-1">
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select
            value={domainFilter}
            onChange={(e) => { setDomainFilter(e.target.value); setPage(1) }}
            className="w-full min-w-0 sm:w-auto sm:min-w-[160px]"
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
          <Card className="border-slate-200 dark:border-slate-700 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No projects match your filters.
          </Card>
        ) : (
          projectsData?.projects.map((project) => {
            const locked = isProjectLocked(project)
            return (
              <Card
                key={project.id}
                className={`cursor-pointer border-slate-200 dark:border-slate-700 transition ${
                  locked
                    ? 'opacity-60'
                    : 'hover:border-violet-200 hover:shadow-md hover:ring-1 hover:ring-violet-50 dark:ring-violet-900'
                }`}
                onClick={() => setDetailProject(project)}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {project.s_no != null && (
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">#{project.s_no}</span>
                      )}
                      {project.domain && (
                        <span className="rounded-full bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-800">
                          {project.domain}
                        </span>
                      )}
                      {locked && <StatusBadge status="locked" />}
                    </div>
                    <h3 className="break-words font-semibold text-slate-900 dark:text-slate-100">{project.title}</h3>
                    {project.abstract && (
                      <p className="mt-1.5 line-clamp-2 break-words text-sm text-slate-600 dark:text-slate-300">{project.abstract}</p>
                    )}
                    <p className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-400">Click to view full details</p>
                  </div>
                  {!locked && (
                    <Button
                      size="sm"
                      className="w-full shrink-0 sm:w-auto"
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
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
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

      {detailProject && (
        <StudentModal onClose={() => setDetailProject(null)}>
          <Card
            className="max-h-[min(85dvh,100%)] w-full min-w-0 overflow-x-hidden overflow-y-auto rounded-b-none border-slate-200 dark:border-slate-700 shadow-xl sm:max-h-[85vh] sm:rounded-xl"
            padding="lg"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {detailProject.s_no != null && (
                  <span className="font-mono text-sm text-slate-500 dark:text-slate-400">#{detailProject.s_no}</span>
                )}
                {detailProject.domain && (
                  <span className="rounded-full bg-violet-50 dark:bg-violet-950/50 px-3 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-800">
                    {detailProject.domain}
                  </span>
                )}
                {isProjectLocked(detailProject) ? (
                  <StatusBadge status="locked" />
                ) : (
                  <StatusBadge status="open" />
                )}
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setDetailProject(null)}>
                Close
              </Button>
            </div>

            <h3 className="break-words text-base font-bold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">
              {detailProject.title}
            </h3>

            <div className="mt-6 min-w-0">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Abstract</h4>
              {detailProject.abstract ? (
                <p className="mt-2 break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300 [overflow-wrap:anywhere]">
                  {detailProject.abstract}
                </p>
              ) : (
                <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">No abstract provided.</p>
              )}
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDetailProject(null)}>
                Back to list
              </Button>
              {!isProjectLocked(detailProject) && (
                <Button
                  className="w-full sm:w-auto"
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
        </StudentModal>
      )}

      {confirmProject && (
        <StudentModal onClose={() => setConfirmProject(null)}>
          <Card className="w-full min-w-0 overflow-x-hidden rounded-b-none border-slate-200 dark:border-slate-700 shadow-xl sm:rounded-xl" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirm Project Selection</h3>
            <p className="mt-2 break-words text-sm font-medium text-violet-700 dark:text-violet-300">{confirmProject.title}</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Are you sure? This cannot be undone. Once selected, your team cannot change their project.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setConfirmProject(null)}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleClaim} disabled={claiming}>
                {claiming ? 'Claiming…' : 'Yes, select this project'}
              </Button>
            </div>
          </Card>
        </StudentModal>
      )}
    </>
  )
}

export function AvailableTopics() {
  return (
    <StudentPageShell title="Available Topics" activeNav="topics">
      {(context) => <AvailableTopicsContent context={context} />}
    </StudentPageShell>
  )
}
