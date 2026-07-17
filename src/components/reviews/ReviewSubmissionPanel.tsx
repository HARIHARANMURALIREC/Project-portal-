import { useRef, useState, type DragEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileUp, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useTeamReviewFiles } from '@/hooks/useTeamReviewFiles'
import {
  buildSuggestedReviewFilename,
  getReviewFileDownloadUrl,
  uploadReviewFile,
} from '@/lib/reviewFiles'
import type { ReviewFileType, TeamReview, TeamReviewFile } from '@/types/database'

function FileUploadZone({
  label,
  fileType,
  existing,
  canUpload,
  suggestedName,
  onUpload,
  uploading,
  disabledReason,
}: {
  label: string
  fileType: ReviewFileType
  existing?: TeamReviewFile
  canUpload: boolean
  suggestedName: string
  onUpload: (file: File, fileType: ReviewFileType) => void
  uploading: boolean
  disabledReason?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const Icon = FileText
  const enabled = canUpload && !disabledReason

  const handleDownload = async () => {
    if (!existing) return
    try {
      const url = await getReviewFileDownloadUrl(existing.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    }
  }

  const handleFile = (file: File) => {
    if (!enabled || uploading) return
    onUpload(file, fileType)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (enabled) setDragOver(true)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    if (!enabled || uploading) return
    const file = event.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-app-surface">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        </div>
        {existing && (
          <Button size="sm" variant="secondary" onClick={() => void handleDownload()}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Download
          </Button>
        )}
      </div>

      <div
        role="button"
        tabIndex={enabled ? 0 : -1}
        aria-disabled={!enabled || uploading}
        onClick={() => {
          if (enabled && !uploading) inputRef.current?.click()
        }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && enabled && !uploading) {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragOver
            ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-950/40'
            : 'border-slate-300 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-900/40'
        } ${enabled && !uploading ? 'cursor-pointer hover:border-violet-400 hover:bg-violet-50/70 dark:hover:border-violet-500 dark:hover:bg-violet-950/30' : 'cursor-not-allowed opacity-70'}`}
      >
        <FileUp className="mx-auto h-8 w-8 text-violet-600 dark:text-violet-400" />
        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {uploading
            ? 'Uploading…'
            : enabled
              ? 'Click or drag file to upload'
              : (disabledReason ?? 'Upload unavailable')}
        </p>
        {existing ? (
          <p className="mt-1 truncate text-xs text-emerald-700 dark:text-emerald-300">
            Uploaded: {existing.original_filename}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Not uploaded yet</p>
        )}
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Required filename: <span className="font-mono">{suggestedName}</span>
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={
          fileType === 'pdf'
            ? '.pdf,application/pdf'
            : '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
        }
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}

export function ReviewSubmissionPanel({
  teamId,
  batchCode,
  review,
  canUpload,
}: {
  teamId: string
  batchCode: string
  review: TeamReview
  canUpload: boolean
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: files = [] } = useTeamReviewFiles(teamId)
  const [uploadingType, setUploadingType] = useState<ReviewFileType | null>(null)

  const reviewFiles = files.filter((f) => f.team_review_id === review.id)
  const pdf = reviewFiles.find((f) => f.file_type === 'pdf')

  const uploadMutation = useMutation({
    mutationFn: async ({ file, fileType }: { file: File; fileType: ReviewFileType }) => {
      if (!user?.id) throw new Error('Not signed in')
      setUploadingType(fileType)
      return uploadReviewFile({
        teamId,
        review,
        batchCode,
        file,
        fileType,
        userId: user.id,
      })
    },
    onSuccess: (_data, vars) => {
      toast.success(`${vars.fileType.toUpperCase()} uploaded successfully`)
      void queryClient.invalidateQueries({ queryKey: ['team-review-files', teamId] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    },
    onSettled: () => setUploadingType(null),
  })

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Submissions
      </p>
      <FileUploadZone
        label="PDF report"
        fileType="pdf"
        existing={pdf}
        canUpload={canUpload}
        suggestedName={buildSuggestedReviewFilename({
          batchCode,
          reviewTitle: review.review_title,
          fileType: 'pdf',
        })}
        uploading={uploadingType === 'pdf'}
        onUpload={(file, fileType) => uploadMutation.mutate({ file, fileType })}
      />
    </div>
  )
}

/** Upload slots shown before any review is scheduled (disabled until coordinator sets a date). */
export function ReviewUploadPlaceholder({
  batchCode,
  reviewTitle = 'Zeroth Review',
}: {
  batchCode: string
  reviewTitle?: string
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Upload is locked — no review scheduled yet
        </p>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          Your coordinator must schedule a review first. After that, the PDF upload area below will
          become active automatically.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-900 dark:text-amber-200">
          <li>Ask your project coordinator to log in and open the Coordinator Dashboard.</li>
          <li>Under <span className="font-medium">Schedule Common Review</span>, pick a review (e.g. Zeroth Review) and set date &amp; time.</li>
          <li>Click <span className="font-medium">Schedule for all teams</span>, then refresh this page.</li>
        </ol>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Submissions (preview)
      </p>
      <FileUploadZone
        label="PDF report"
        fileType="pdf"
        canUpload={false}
        suggestedName={buildSuggestedReviewFilename({
          batchCode,
          reviewTitle,
          fileType: 'pdf',
        })}
        uploading={false}
        onUpload={() => undefined}
        disabledReason="Waiting for review schedule"
      />
    </div>
  )
}

/** Read-only download links for supervisors / batch coordinators. */
export function ReviewFileDownloads({
  teamId,
  reviewId,
}: {
  teamId: string
  reviewId: string
}) {
  const { data: files = [] } = useTeamReviewFiles(teamId)
  const reviewFiles = files.filter((f) => f.team_review_id === reviewId)

  if (reviewFiles.length === 0) {
    return <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No files uploaded yet.</p>
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {reviewFiles.map((file) => (
        <Button
          key={file.id}
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              const url = await getReviewFileDownloadUrl(file.storage_path)
              window.open(url, '_blank', 'noopener,noreferrer')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Download failed')
            }
          }}
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          {file.file_type.toUpperCase()}: {file.original_filename}
        </Button>
      ))}
    </div>
  )
}
