import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Download, Trash2, Eye, BookOpen, FileText, Presentation, Newspaper, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useStudentContext } from '@/hooks/useStudentContext'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  TEMPLATE_CONFIGS,
  fetchCoordinatorTemplates,
  fetchTeamTemplateUploads,
  uploadTeamTemplate,
  deleteTeamTemplateUpload,
  getTemplateFileUrl,
  type TemplateType,
  type CoordinatorTemplateFile,
  type TeamTemplateUpload,
} from '@/lib/templateUploads'

const TYPE_ICONS: Record<TemplateType, typeof BookOpen> = {
  literature_survey: BookOpen,
  first_review_ppt: Presentation,
  review_report: FileText,
  journal_papers: Newspaper,
}

function StudentTemplateCard({
  config,
  demoFile,
  myUpload,
  teamId,
  onChanged,
}: {
  config: (typeof TEMPLATE_CONFIGS)[number]
  demoFile: CoordinatorTemplateFile | undefined
  myUpload: TeamTemplateUpload | undefined
  teamId: string
  onChanged: () => void
}) {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const Icon = TYPE_ICONS[config.type]

  const handleViewDemo = async () => {
    if (!demoFile) return
    try {
      const url = await getTemplateFileUrl(demoFile.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not open file')
    }
  }

  const handleDownloadDemo = async () => {
    if (!demoFile) return
    try {
      const url = await getTemplateFileUrl(demoFile.storage_path)
      const a = document.createElement('a')
      a.href = url
      a.download = demoFile.original_filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('Download failed')
    }
  }

  const handleViewMy = async () => {
    if (!myUpload) return
    try {
      const url = await getTemplateFileUrl(myUpload.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not open file')
    }
  }

  const handleDownloadMy = async () => {
    if (!myUpload) return
    try {
      const url = await getTemplateFileUrl(myUpload.storage_path)
      const a = document.createElement('a')
      a.href = url
      a.download = myUpload.original_filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('Download failed')
    }
  }

  const handleUpload = async (file: File) => {
    if (!user?.id) return
    setUploading(true)
    try {
      await uploadTeamTemplate(file, config.type, teamId, user.id)
      toast.success(`${config.label} submitted`)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!myUpload || !window.confirm(`Remove your ${config.label} submission? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteTeamTemplateUpload(myUpload)
      toast.success('Submission removed')
      onChanged()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-app-surface ${config.borderColor}`}>
      <div className={`h-1 w-full ${config.iconBg}`} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Header */}
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

        {/* Demo file from coordinator */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Demo from Coordinator
          </p>
          {demoFile ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                {demoFile.original_filename}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  title="View PDF"
                  onClick={() => void handleViewDemo()}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:opacity-80 ${config.iconBg} ${config.iconColor}`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
                <button
                  type="button"
                  title="Download"
                  onClick={() => void handleDownloadDemo()}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">Not yet uploaded by coordinator</span>
          )}
        </div>

        {/* My submission */}
        <div className={`rounded-lg border px-3 py-2 ${myUpload ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'}`}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            My Submission
          </p>
          {myUpload ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  {myUpload.original_filename}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  title="View PDF"
                  onClick={() => void handleViewMy()}
                  className="rounded p-1.5 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Download" onClick={() => void handleDownloadMy()} className="rounded p-1.5 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Delete" onClick={() => void handleDelete()} disabled={deleting} className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/40">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Not submitted yet
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
          {uploading ? 'Uploading…' : myUpload ? `Replace submission` : `Upload my ${config.label}`}
        </button>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={config.accept}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

export function StudentTemplatesPanel() {
  const queryClient = useQueryClient()
  const { data: ctx } = useStudentContext()

  const teamId = ctx?.team.id ?? ''

  const { data: demoFiles = [], isLoading: demosLoading } = useQuery({
    queryKey: ['coordinator-template-files'],
    queryFn: fetchCoordinatorTemplates,
  })

  const { data: myUploads = [], isLoading: uploadsLoading } = useQuery({
    queryKey: ['team-template-uploads', teamId],
    queryFn: () => fetchTeamTemplateUploads(teamId),
    enabled: !!teamId,
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['team-template-uploads', teamId] })
  }

  const demoByType = Object.fromEntries(demoFiles.map((f) => [f.template_type, f]))
  const myUploadByType = Object.fromEntries(myUploads.map((u) => [u.template_type, u]))

  const submittedCount = myUploads.length
  const totalCount = TEMPLATE_CONFIGS.length

  if (demosLoading || uploadsLoading) return <TableSkeleton rows={4} />

  return (
    <div className="space-y-6">
      {/* Progress banner */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Submission Progress
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {submittedCount} of {totalCount} documents submitted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-violet-600 transition-all"
              style={{ width: `${(submittedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
            {Math.round((submittedCount / totalCount) * 100)}%
          </span>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/30">
        <span className="mt-0.5 text-amber-600 dark:text-amber-400">⚠️</span>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Download the demo file from your coordinator first, use it as a format reference, then upload your completed document.
          Your submissions will be visible to your supervisor, reviewer, and coordinator.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATE_CONFIGS.map((cfg) => (
          <StudentTemplateCard
            key={cfg.type}
            config={cfg}
            demoFile={demoByType[cfg.type]}
            myUpload={myUploadByType[cfg.type]}
            teamId={teamId}
            onChanged={refresh}
          />
        ))}
      </div>
    </div>
  )
}
