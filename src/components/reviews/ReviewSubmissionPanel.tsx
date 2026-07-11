import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileUp, FileText, Presentation } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useTeamReviewFiles } from '@/hooks/useTeamReviewFiles'
import {
  buildSuggestedReviewFilename,
  getReviewFileDownloadUrl,
  uploadReviewFile,
} from '@/lib/reviewFiles'
import type { ReviewFileType, TeamReview, TeamReviewFile } from '@/types/database'

function FileRow({
  label,
  fileType,
  existing,
  canUpload,
  suggestedName,
  onUpload,
  uploading,
}: {
  label: string
  fileType: ReviewFileType
  existing?: TeamReviewFile
  canUpload: boolean
  suggestedName: string
  onUpload: (file: File, fileType: ReviewFileType) => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const Icon = fileType === 'pdf' ? FileText : Presentation

  const handleDownload = async () => {
    if (!existing) return
    try {
      const url = await getReviewFileDownloadUrl(existing.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-app-surface">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
            {existing ? (
              <p className="truncate text-xs text-emerald-700 dark:text-emerald-300">{existing.original_filename}</p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Not uploaded yet</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {existing && (
            <Button size="sm" variant="secondary" onClick={() => void handleDownload()}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Download
            </Button>
          )}
          {canUpload && (
            <>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={fileType === 'pdf' ? '.pdf,application/pdf' : '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onUpload(file, fileType)
                  e.target.value = ''
                }}
              />
              <Button
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <FileUp className="mr-1 h-3.5 w-3.5" />
                {existing ? 'Replace' : 'Upload'}
              </Button>
            </>
          )}
        </div>
      </div>
      {canUpload && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Required filename format: <span className="font-mono">{suggestedName}</span>
        </p>
      )}
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
  const ppt = reviewFiles.find((f) => f.file_type === 'ppt')

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
      <FileRow
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
      <FileRow
        label="PPT presentation"
        fileType="ppt"
        existing={ppt}
        canUpload={canUpload}
        suggestedName={buildSuggestedReviewFilename({
          batchCode,
          reviewTitle: review.review_title,
          fileType: 'ppt',
        })}
        uploading={uploadingType === 'ppt'}
        onUpload={(file, fileType) => uploadMutation.mutate({ file, fileType })}
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
