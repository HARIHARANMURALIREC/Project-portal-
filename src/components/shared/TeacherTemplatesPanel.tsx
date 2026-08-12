import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, BookOpen, FileText, Presentation, Newspaper, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTeacherTeams } from '@/hooks/useTeacherTeams'
import { useReviewerTeams } from '@/hooks/useReviewerTeams'
import { useAuth } from '@/hooks/useAuth'
import { isSectionReviewer } from '@/lib/sectionReviewers'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  TEMPLATE_CONFIGS,
  fetchCoordinatorTemplates,
  fetchAllTeamTemplateUploads,
  getTemplateFileUrl,
  type TemplateType,
} from '@/lib/templateUploads'
import type { TeamWithDetails } from '@/types/database'

const TYPE_ICONS: Record<TemplateType, typeof BookOpen> = {
  literature_survey: BookOpen,
  first_review_ppt: Presentation,
  review_report: FileText,
  journal_papers: Newspaper,
}

function TeamSubmissionsTable({ teams, allUploads }: { teams: TeamWithDetails[]; allUploads: ReturnType<typeof fetchAllTeamTemplateUploads> extends Promise<infer T> ? T : never[] }) {
  const teamSet = new Set(teams.map((t) => t.id))
  const relevantUploads = allUploads.filter((u) => teamSet.has(u.team_id))

  // Group by team
  const uploadsByTeam = new Map<string, typeof relevantUploads>()
  for (const u of relevantUploads) {
    const list = uploadsByTeam.get(u.team_id) ?? []
    list.push(u)
    uploadsByTeam.set(u.team_id, list)
  }

  const handleDownload = async (storagePath: string) => {
    try {
      const url = await getTemplateFileUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Download failed')
    }
  }

  if (teams.length === 0) {
    return (
      <Card padding="lg" className="text-center text-sm text-slate-500 dark:text-slate-400">
        No teams assigned to you.
      </Card>
    )
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800/80">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Document</th>
            <th className="px-4 py-3">Submitted File</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {teams.map((team) => {
            const uploads = uploadsByTeam.get(team.id) ?? []
            const uploadByType = new Map(uploads.map((u) => [u.template_type, u]))

            return TEMPLATE_CONFIGS.map((cfg, cfgIdx) => {
              const upload = uploadByType.get(cfg.type)
              const Icon = TYPE_ICONS[cfg.type]
              return (
                <tr key={`${team.id}-${cfg.type}`} className="bg-white dark:bg-app-surface">
                  {cfgIdx === 0 && (
                    <td className="px-4 py-3 align-top font-mono text-xs font-semibold text-violet-700 dark:text-violet-300" rowSpan={TEMPLATE_CONFIGS.length}>
                      {team.batch_code}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cfg.iconBg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cfg.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {upload ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="max-w-[160px] truncate text-xs text-slate-700 dark:text-slate-300">
                          {upload.original_filename}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Not submitted
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {upload ? new Date(upload.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {upload ? (
                      <button
                        type="button"
                        onClick={() => void handleDownload(upload.storage_path)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })
          })}
        </tbody>
      </table>
    </Card>
  )
}

export function TeacherTemplatesPanel() {
  const { profile } = useAuth()
  const { data: supervisorTeams = [], isLoading: supLoading } = useTeacherTeams()
  const { data: reviewerTeams = [], isLoading: revLoading } = useReviewerTeams()

  const { data: demoFiles = [], isLoading: demosLoading } = useQuery({
    queryKey: ['coordinator-template-files'],
    queryFn: fetchCoordinatorTemplates,
  })

  const { data: allUploads = [], isLoading: uploadsLoading } = useQuery({
    queryKey: ['all-team-template-uploads'],
    queryFn: fetchAllTeamTemplateUploads,
  })

  const isLoading = supLoading || revLoading || demosLoading || uploadsLoading

  const demoByType = Object.fromEntries(demoFiles.map((f) => [f.template_type, f]))

  const handleDownloadDemo = async (storagePath: string) => {
    try {
      const url = await getTemplateFileUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Download failed')
    }
  }

  // Deduplicate teams (a teacher could be both supervisor and reviewer for same team)
  const reviewerOnlyTeams = isSectionReviewer(profile)
    ? reviewerTeams
    : reviewerTeams.filter((rt) => !supervisorTeams.some((st) => st.id === rt.id))

  return (
    <div className="space-y-8">
      {/* ── Demo templates section ── */}
      <section>
        <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Demo Templates</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Reference files uploaded by the coordinator. Download to see the expected format.
        </p>
        {demosLoading ? (
          <TableSkeleton rows={1} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATE_CONFIGS.map((cfg) => {
              const demo = demoByType[cfg.type]
              const Icon = TYPE_ICONS[cfg.type]
              return (
                <div key={cfg.type} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${cfg.borderColor} bg-white dark:bg-app-surface`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
                      <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{cfg.label}</p>
                      <p className="text-[10px] text-slate-400">{demo ? demo.original_filename : 'Not uploaded'}</p>
                    </div>
                  </div>
                  {demo ? (
                    <button
                      type="button"
                      onClick={() => void handleDownloadDemo(demo.storage_path)}
                      className={`shrink-0 rounded-lg p-1.5 ${cfg.iconBg} ${cfg.iconColor} hover:opacity-80`}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">—</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Supervisor teams section ── */}
      {supervisorTeams.length > 0 && (
        <section>
          <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Supervised Teams — Submissions</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Documents submitted by the teams you supervise.
          </p>
          {isLoading ? <TableSkeleton rows={4} /> : (
            <TeamSubmissionsTable teams={supervisorTeams} allUploads={allUploads} />
          )}
        </section>
      )}

      {/* ── Reviewer teams section ── */}
      {reviewerOnlyTeams.length > 0 && (
        <section>
          <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Reviewer Teams — Submissions</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Documents submitted by the teams you review.
          </p>
          {isLoading ? <TableSkeleton rows={4} /> : (
            <TeamSubmissionsTable teams={reviewerOnlyTeams} allUploads={allUploads} />
          )}
        </section>
      )}

      {supervisorTeams.length === 0 && reviewerOnlyTeams.length === 0 && !isLoading && (
        <Card padding="lg" className="text-center text-sm text-slate-500 dark:text-slate-400">
          No teams assigned to you yet.
        </Card>
      )}
    </div>
  )
}
