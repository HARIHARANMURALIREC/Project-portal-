import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Download, Trash2, BookOpen, FileText, Presentation, Newspaper, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  TEMPLATE_CONFIGS,
  fetchCoordinatorTemplates,
  uploadCoordinatorTemplate,
  deleteCoordinatorTemplate,
  fetchAllTeamTemplateUploads,
  getTemplateFileUrl,
  type TemplateType,
  type CoordinatorTemplateFile,
} from '@/lib/templateUploads'
import { fetchAllCoordinatorTeams } from '@/lib/coordinatorData'

const TYPE_ICONS: Record<TemplateType, typeof BookOpen> = {
  literature_survey: BookOpen,
  first_review_ppt: Presentation,
  review_report: FileText,
  journal_papers: Newspaper,
}

function CoordinatorTemplateCard({
  config,
  existing,
  onUploaded,
}: {
  config: (typeof TEMPLATE_CONFIGS)[number]
  existing: CoordinatorTemplateFile | undefined
  onUploaded: () => void
}) {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const Icon = TYPE_ICONS[config.type]

  const handleFile = async (file: File) => {
    if (!user?.id) return
    setUploading(true)
    try {
      await uploadCoordinatorTemplate(file, config.type, user.id)
      toast.success(`${config.label} demo uploaded`)
      onUploaded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!existing || !window.confirm(`Delete "${existing.original_filename}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteCoordinatorTemplate(existing)
      toast.success(`${config.label} demo removed`)
      onUploaded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleDownload = async () => {
    if (!existing) return
    try {
      const url = await getTemplateFileUrl(existing.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Download failed')
    }
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-app-surface ${config.borderColor}`}>
      <div className={`h-1 w-full ${config.iconBg}`} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${config.badgeColor}`}>
            {config.badge}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{config.label}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{config.description}</p>
        </div>

        {/* Current file status */}
        <div className={`rounded-lg border px-3 py-2 text-xs ${existing ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'}`}>
          {existing ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate font-medium text-emerald-800 dark:text-emerald-300">{existing.original_filename}</span>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => void handleDownload()} className="rounded p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/40">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>No demo file uploaded yet</span>
            </div>
          )}
        </div>

        {/* Upload button */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50 ${config.borderColor} ${config.iconColor}`}
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading…' : existing ? 'Replace demo file' : 'Upload demo file'}
        </button>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={config.accept}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

export function CoordinatorTemplatesPanel() {
  const queryClient = useQueryClient()

  const { data: demoFiles = [], isLoading: demosLoading } = useQuery({
    queryKey: ['coordinator-template-files'],
    queryFn: fetchCoordinatorTemplates,
  })

  const { data: allUploads = [], isLoading: uploadsLoading } = useQuery({
    queryKey: ['all-team-template-uploads'],
    queryFn: fetchAllTeamTemplateUploads,
  })

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['coordinator-teams'],
    queryFn: fetchAllCoordinatorTeams,
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['coordinator-template-files'] })
    void queryClient.invalidateQueries({ queryKey: ['all-team-template-uploads'] })
  }

  const demoByType = Object.fromEntries(demoFiles.map((f) => [f.template_type, f]))

  // Group uploads by team
  const teamMap = new Map(teams.map((t) => [t.id, t]))
  const uploadsByTeam = new Map<string, typeof allUploads>()
  for (const u of allUploads) {
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

  return (
    <div className="space-y-8">
      {/* ── Demo file upload section ── */}
      <section>
        <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Demo Templates</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Upload the demo/reference files for each document type. Students will download these as format guides before submitting their own work.
        </p>

        {demosLoading ? (
          <TableSkeleton rows={2} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {TEMPLATE_CONFIGS.map((cfg) => (
              <CoordinatorTemplateCard
                key={cfg.type}
                config={cfg}
                existing={demoByType[cfg.type]}
                onUploaded={refresh}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Student submissions section ── */}
      <section>
        <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Student Submissions</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Documents uploaded by student teams. Grouped by team.
        </p>

        {uploadsLoading || teamsLoading ? (
          <TableSkeleton rows={5} />
        ) : allUploads.length === 0 ? (
          <Card padding="lg" className="text-center text-sm text-slate-500 dark:text-slate-400">
            No student submissions yet.
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from(uploadsByTeam.entries()).flatMap(([teamId, uploads]) => {
                  const team = teamMap.get(teamId)
                  return uploads.map((upload, idx) => {
                    const cfg = TEMPLATE_CONFIGS.find((c) => c.type === upload.template_type)
                    return (
                      <tr key={upload.id} className="bg-white dark:bg-app-surface">
                        {idx === 0 && (
                          <>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-violet-700 dark:text-violet-300" rowSpan={uploads.length}>
                              {team?.batch_code ?? teamId.slice(0, 8)}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300" rowSpan={uploads.length}>
                              {team?.supervisor_name ?? '—'}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cfg?.badgeColor ?? ''}`}>
                            {cfg?.label ?? upload.template_type}
                          </span>
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <p className="truncate text-xs text-slate-700 dark:text-slate-300">{upload.original_filename}</p>
                          <p className="text-[10px] text-slate-400">{new Date(upload.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleDownload(upload.storage_path)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  )
}
