import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileArchive, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useCoordinatorTeams } from '@/hooks/useCoordinatorTeams'
import {
  fetchAllCoordinatorTeams,
  fetchAllReviewFiles,
  fetchAllTeamReviews,
} from '@/lib/coordinatorData'
import {
  buildReviewFilesZip,
  deleteReviewFile,
  getReviewFileDownloadUrl,
  triggerBlobDownload,
  type ZipReviewFileEntry,
} from '@/lib/reviewFiles'
import { formatReviewSchedule, STANDARD_REVIEW_TITLES } from '@/lib/reviews'
import { teamBatchOptions, teamMatchesFilters, uniqueSorted } from '@/lib/teamFilters'
import {
  TEMPLATE_CONFIGS,
  buildTemplateFilesZip,
  deleteTeamTemplateUpload,
  fetchAllTeamTemplateUploads,
  getTemplateFileUrl,
  type TeamTemplateUpload,
  type TemplateType,
} from '@/lib/templateUploads'
import type { TeamReview, TeamReviewFile, TeamWithDetails } from '@/types/database'

const FIRST_REVIEW_TITLE = 'First Review'
const ZEROTH_REVIEW_TITLE = 'Zeroth Review'
const FIRST_REVIEW_UPLOAD_TYPES = TEMPLATE_CONFIGS.map((c) => c.type)

function DownloadLink({ file }: { file: TeamReviewFile }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
      onClick={() => {
        void (async () => {
          setBusy(true)
          try {
            const url = await getReviewFileDownloadUrl(file.storage_path)
            window.open(url, '_blank', 'noopener,noreferrer')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Download failed')
          } finally {
            setBusy(false)
          }
        })()
      }}
    >
      <Download className="h-3.5 w-3.5" />
      {busy ? '…' : file.file_type.toUpperCase()}
    </button>
  )
}

function DeleteFileButton({ file, onDeleted }: { file: TeamReviewFile; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      title={`Delete ${file.file_type.toUpperCase()}`}
      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
      onClick={() => {
        if (!window.confirm(`Delete ${file.original_filename}?\n\nThis cannot be undone.`)) return
        void (async () => {
          setBusy(true)
          try {
            await deleteReviewFile(file)
            toast.success(`${file.file_type.toUpperCase()} deleted`)
            onDeleted()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed')
          } finally {
            setBusy(false)
          }
        })()
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {busy ? '…' : 'Delete'}
    </button>
  )
}

function TemplateDownloadLink({ upload }: { upload: TeamTemplateUpload }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
      onClick={() => {
        void (async () => {
          setBusy(true)
          try {
            const url = await getTemplateFileUrl(upload.storage_path)
            window.open(url, '_blank', 'noopener,noreferrer')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Download failed')
          } finally {
            setBusy(false)
          }
        })()
      }}
    >
      <Download className="h-3.5 w-3.5" />
      {busy ? '…' : 'File'}
    </button>
  )
}

function TemplateDeleteButton({
  upload,
  onDeleted,
}: {
  upload: TeamTemplateUpload
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      title={`Delete ${upload.original_filename}`}
      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
      onClick={() => {
        if (!window.confirm(`Delete ${upload.original_filename}?\n\nThis cannot be undone.`)) return
        void (async () => {
          setBusy(true)
          try {
            await deleteTeamTemplateUpload(upload)
            toast.success('File deleted')
            onDeleted()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed')
          } finally {
            setBusy(false)
          }
        })()
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {busy ? '…' : 'Delete'}
    </button>
  )
}

function TemplateUploadCell({
  upload,
  showDelete,
  onDeleted,
}: {
  upload: TeamTemplateUpload | null
  showDelete: boolean
  onDeleted: () => void
}) {
  if (!upload) {
    return <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Missing</span>
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        <TemplateDownloadLink upload={upload} />
        {showDelete && <TemplateDeleteButton upload={upload} onDeleted={onDeleted} />}
      </div>
      <p className="mt-0.5 max-w-[160px] truncate text-xs text-slate-500">{upload.original_filename}</p>
    </div>
  )
}

export function ReviewUploadsPanel({ exportPrefix = 'review-uploads', showDelete = false }: { exportPrefix?: string; showDelete?: boolean } = {}) {
  const queryClient = useQueryClient()
  const coordinatorScoped = exportPrefix.startsWith('coordinator')
  const [batchFilter, setBatchFilter] = useState('')
  const [supervisorFilter, setSupervisorFilter] = useState('')
  const [reviewerFilter, setReviewerFilter] = useState('')
  const [reviewTitleFilter, setReviewTitleFilter] = useState(FIRST_REVIEW_TITLE)
  const [uploadFilter, setUploadFilter] = useState('')
  const [search, setSearch] = useState('')
  const [zipBusy, setZipBusy] = useState(false)
  const [zipProgress, setZipProgress] = useState<string | null>(null)

  const isFirstReviewView = reviewTitleFilter === FIRST_REVIEW_TITLE
  const isZerothReviewView = reviewTitleFilter === ZEROTH_REVIEW_TITLE
  const hidePptColumn = isZerothReviewView

  const invalidateFiles = () =>
    void queryClient.invalidateQueries({ queryKey: ['coordinator-all-review-files'] })
  const invalidateTemplateUploads = () =>
    void queryClient.invalidateQueries({ queryKey: ['all-team-template-uploads'] })

  const coordinatorTeamsQuery = useCoordinatorTeams()
  const allTeamsQuery = useQuery({
    queryKey: ['coordinator-teams', 'all'],
    queryFn: fetchAllCoordinatorTeams,
    enabled: !coordinatorScoped,
  })

  const { data: teams = [], isLoading: teamsLoading } = coordinatorScoped
    ? coordinatorTeamsQuery
    : allTeamsQuery
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['coordinator-all-reviews'],
    queryFn: fetchAllTeamReviews,
  })
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['coordinator-all-review-files'],
    queryFn: fetchAllReviewFiles,
  })
  const { data: templateUploads = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['all-team-template-uploads'],
    queryFn: fetchAllTeamTemplateUploads,
  })

  const isLoading = teamsLoading || reviewsLoading || filesLoading || templatesLoading

  const batches = useMemo(() => teamBatchOptions(teams), [teams])
  const supervisors = useMemo(() => uniqueSorted(teams.map((t) => t.supervisor_name)), [teams])
  const reviewers = useMemo(() => uniqueSorted(teams.map((t) => t.reviewer_name)), [teams])

  const rows = useMemo(() => {
    const reviewsByTeam = new Map<string, typeof reviews>()
    for (const r of reviews) {
      const list = reviewsByTeam.get(r.team_id) ?? []
      list.push(r)
      reviewsByTeam.set(r.team_id, list)
    }
    const filesByReview = new Map<string, TeamReviewFile[]>()
    for (const f of files) {
      const list = filesByReview.get(f.team_review_id) ?? []
      list.push(f)
      filesByReview.set(f.team_review_id, list)
    }

    return teams.map((team) => {
      const teamReviews = (reviewsByTeam.get(team.id) ?? []).slice().sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      )
      return {
        team,
        reviews: teamReviews.map((review) => {
          const reviewFiles = filesByReview.get(review.id) ?? []
          return {
            review,
            pdf: reviewFiles.find((f) => f.file_type === 'pdf') ?? null,
            ppt: reviewFiles.find((f) => f.file_type === 'ppt') ?? null,
          }
        }),
      }
    })
  }, [teams, reviews, files])

  const uploadsByTeam = useMemo(() => {
    const map = new Map<string, Map<TemplateType, TeamTemplateUpload>>()
    for (const upload of templateUploads) {
      let byType = map.get(upload.team_id)
      if (!byType) {
        byType = new Map()
        map.set(upload.team_id, byType)
      }
      byType.set(upload.template_type, upload)
    }
    return map
  }, [templateUploads])

  const firstReviewByTeam = useMemo(() => {
    const map = new Map<string, TeamReview>()
    for (const r of reviews) {
      if (r.review_title !== FIRST_REVIEW_TITLE) continue
      const existing = map.get(r.team_id)
      if (!existing || new Date(r.scheduled_at) < new Date(existing.scheduled_at)) {
        map.set(r.team_id, r)
      }
    }
    return map
  }, [reviews])

  const firstReviewRows = useMemo(() => {
    return teams
      .filter((team) =>
        teamMatchesFilters(team, {
          batchId: batchFilter,
          supervisor: supervisorFilter,
          reviewer: reviewerFilter,
          search,
        }),
      )
      .map((team) => {
        const byType = uploadsByTeam.get(team.id)
        const uploads = Object.fromEntries(
          FIRST_REVIEW_UPLOAD_TYPES.map((type) => [type, byType?.get(type) ?? null]),
        ) as Record<TemplateType, TeamTemplateUpload | null>
        return {
          team,
          review: firstReviewByTeam.get(team.id) ?? null,
          uploads,
        }
      })
      .filter(({ review, uploads }) => {
        if (!uploadFilter) return true
        const values = FIRST_REVIEW_UPLOAD_TYPES.map((t) => uploads[t])
        const uploadedCount = values.filter(Boolean).length
        if (uploadFilter === 'all_uploaded') return uploadedCount === FIRST_REVIEW_UPLOAD_TYPES.length
        if (uploadFilter === 'incomplete') return uploadedCount < FIRST_REVIEW_UPLOAD_TYPES.length
        if (uploadFilter === 'none_scheduled') return review == null
        if (uploadFilter.startsWith('missing:')) {
          const type = uploadFilter.slice('missing:'.length) as TemplateType
          return uploads[type] == null
        }
        return true
      })
  }, [
    teams,
    batchFilter,
    supervisorFilter,
    reviewerFilter,
    search,
    uploadFilter,
    uploadsByTeam,
    firstReviewByTeam,
  ])

  const filtered = useMemo(() => {
    return rows
      .filter(({ team }) =>
        teamMatchesFilters(team, {
          batchId: batchFilter,
          supervisor: supervisorFilter,
          reviewer: reviewerFilter,
          search,
        }),
      )
      .map(({ team, reviews: teamReviews }) => {
        let nextReviews = teamReviews
        if (reviewTitleFilter) {
          nextReviews = nextReviews.filter((r) => r.review.review_title === reviewTitleFilter)
        }
        if (uploadFilter === 'pdf_missing') {
          nextReviews = nextReviews.filter((r) => !r.pdf)
        } else if (uploadFilter === 'ppt_missing') {
          nextReviews = nextReviews.filter((r) => !r.ppt)
        } else if (uploadFilter === 'both') {
          nextReviews = nextReviews.filter((r) => (hidePptColumn ? !!r.pdf : r.pdf && r.ppt))
        } else if (uploadFilter === 'incomplete') {
          nextReviews = nextReviews.filter((r) => (hidePptColumn ? !r.pdf : !r.pdf || !r.ppt))
        } else if (uploadFilter === 'none_scheduled') {
          nextReviews = teamReviews.length === 0 ? teamReviews : []
        }

        if (uploadFilter === 'none_scheduled') {
          return teamReviews.length === 0 ? { team, reviews: [] as typeof teamReviews } : null
        }

        if (reviewTitleFilter || uploadFilter) {
          if (nextReviews.length === 0) return null
          return { team, reviews: nextReviews }
        }
        return { team, reviews: nextReviews }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
  }, [rows, batchFilter, supervisorFilter, reviewerFilter, reviewTitleFilter, uploadFilter, search, hidePptColumn])

  const stats = useMemo(() => {
    if (isFirstReviewView) {
      const counts = Object.fromEntries(FIRST_REVIEW_UPLOAD_TYPES.map((t) => [t, 0])) as Record<
        TemplateType,
        number
      >
      let scheduled = 0
      for (const row of firstReviewRows) {
        if (row.review) scheduled += 1
        for (const type of FIRST_REVIEW_UPLOAD_TYPES) {
          if (row.uploads[type]) counts[type] += 1
        }
      }
      return {
        teams: firstReviewRows.length,
        scheduled,
        withPdf: counts.literature_survey,
        withPpt: counts.first_review_ppt,
        withReport: counts.review_report,
        withJournal: counts.journal_papers,
      }
    }

    let withPdf = 0
    let withPpt = 0
    let scheduled = 0
    for (const row of filtered) {
      for (const r of row.reviews) {
        scheduled += 1
        if (r.pdf) withPdf += 1
        if (r.ppt) withPpt += 1
      }
    }
    return {
      scheduled,
      withPdf,
      withPpt,
      teams: filtered.length,
      withReport: 0,
      withJournal: 0,
    }
  }, [filtered, firstReviewRows, isFirstReviewView])

  const clearFilters = () => {
    setBatchFilter('')
    setSupervisorFilter('')
    setReviewerFilter('')
    setReviewTitleFilter(FIRST_REVIEW_TITLE)
    setUploadFilter('')
    setSearch('')
  }

  const zipEntries = useMemo((): ZipReviewFileEntry[] => {
    if (isFirstReviewView) return []

    const entries: ZipReviewFileEntry[] = []
    for (const { team, reviews: teamReviews } of filtered) {
      for (const { review, pdf, ppt } of teamReviews) {
        if (pdf) {
          entries.push({
            storage_path: pdf.storage_path,
            original_filename: pdf.original_filename,
            batchCode: team.batch_code,
            reviewTitle: review.review_title,
          })
        }
        if (!hidePptColumn && ppt) {
          entries.push({
            storage_path: ppt.storage_path,
            original_filename: ppt.original_filename,
            batchCode: team.batch_code,
            reviewTitle: review.review_title,
          })
        }
      }
    }
    return entries
  }, [filtered, isFirstReviewView, hidePptColumn])

  const firstReviewZipCount = useMemo(() => {
    if (!isFirstReviewView) return 0
    let count = 0
    for (const { uploads } of firstReviewRows) {
      for (const type of FIRST_REVIEW_UPLOAD_TYPES) {
        if (uploads[type]) count += 1
      }
    }
    return count
  }, [firstReviewRows, isFirstReviewView])

  const exportExcel = () => {
    if (isFirstReviewView) {
      const exportRows = firstReviewRows.map(({ team, review, uploads }) => ({
        'Team ID': team.batch_code,
        Supervisor: team.supervisor_name ?? '',
        Reviewer: team.reviewer_name ?? '',
        'First Review': review
          ? formatReviewSchedule(review.scheduled_at, review.scheduled_end_at)
          : 'Not scheduled',
        'Literature Survey': uploads.literature_survey?.original_filename ?? 'Missing',
        'First Review PPT': uploads.first_review_ppt?.original_filename ?? 'Missing',
        'Review Report': uploads.review_report?.original_filename ?? 'Missing',
        'Journal Papers': uploads.journal_papers?.original_filename ?? 'Missing',
      }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'First Review')
      XLSX.writeFile(wb, `${exportPrefix}-first-review-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('First Review report downloaded')
      return
    }

    const exportRows = filtered.flatMap(({ team, reviews: teamReviews }) => {
      if (teamReviews.length === 0) {
        return [
          {
            'Team ID': team.batch_code,
            Supervisor: team.supervisor_name ?? '',
            Reviewer: team.reviewer_name ?? '',
            Review: '—',
            PDF: 'No',
            ...(hidePptColumn ? {} : { PPT: 'No', 'PPT filename': '' }),
            'PDF filename': '',
          },
        ]
      }
      return teamReviews.map(({ review, pdf, ppt }) => ({
        'Team ID': team.batch_code,
        Supervisor: team.supervisor_name ?? '',
        Reviewer: team.reviewer_name ?? '',
        Review: review.review_title,
        Scheduled: formatReviewSchedule(review.scheduled_at, review.scheduled_end_at),
        PDF: pdf ? 'Yes' : 'No',
        ...(hidePptColumn
          ? {}
          : {
              PPT: ppt ? 'Yes' : 'No',
              'PPT filename': ppt?.original_filename ?? '',
            }),
        'PDF filename': pdf?.original_filename ?? '',
      }))
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'Uploads')
    XLSX.writeFile(wb, `${exportPrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Upload report downloaded')
  }

  const downloadZip = () => {
    if (isFirstReviewView) {
      const entries = firstReviewRows.flatMap(({ team, uploads }) =>
        FIRST_REVIEW_UPLOAD_TYPES.flatMap((type) => {
          const upload = uploads[type]
          if (!upload) return []
          const label = TEMPLATE_CONFIGS.find((c) => c.type === type)?.label ?? type
          return [
            {
              storage_path: upload.storage_path,
              original_filename: upload.original_filename,
              batchCode: team.batch_code,
              documentLabel: label,
            },
          ]
        }),
      )
      if (entries.length === 0) {
        toast.error('No uploaded files match the current filters')
        return
      }
      void (async () => {
        setZipBusy(true)
        setZipProgress(`0 / ${entries.length}`)
        try {
          const blob = await buildTemplateFilesZip(entries, (done, total) => {
            setZipProgress(`${done} / ${total}`)
          })
          const stamp = new Date().toISOString().slice(0, 10)
          triggerBlobDownload(blob, `${exportPrefix}-first-review-${stamp}.zip`)
          toast.success(`Downloaded ZIP with ${entries.length} file${entries.length === 1 ? '' : 's'}`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'ZIP download failed')
        } finally {
          setZipBusy(false)
          setZipProgress(null)
        }
      })()
      return
    }

    if (zipEntries.length === 0) {
      toast.error('No uploaded files match the current filters')
      return
    }

    void (async () => {
      setZipBusy(true)
      setZipProgress(`0 / ${zipEntries.length}`)
      try {
        const blob = await buildReviewFilesZip(zipEntries, (done, total) => {
          setZipProgress(`${done} / ${total}`)
        })
        const stamp = new Date().toISOString().slice(0, 10)
        triggerBlobDownload(blob, `${exportPrefix}-${stamp}.zip`)
        toast.success(`Downloaded ZIP with ${zipEntries.length} file${zipEntries.length === 1 ? '' : 's'}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'ZIP download failed')
      } finally {
        setZipBusy(false)
        setZipProgress(null)
      }
    })()
  }

  const tableEmpty = isFirstReviewView ? firstReviewRows.length === 0 : filtered.length === 0
  const exportDisabled = isLoading || tableEmpty

  return (
    <>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        {isFirstReviewView
          ? 'First Review schedule and template uploads (Literature Survey, PPT, Review Report, Journal Papers) for every team.'
          : hidePptColumn
            ? 'PDF (abstract) uploads for Zeroth Review. Download individual files, pack filtered uploads as a ZIP, or export status to Excel.'
            : 'PDF and PPT uploads for every team. Download individual files, pack filtered uploads as a ZIP, or export status to Excel.'}
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        <Card padding="sm" className="inline-flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.teams}</span>
          <span className="text-xs text-slate-500">teams shown</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.scheduled}</span>
          <span className="text-xs text-slate-500">
            {isFirstReviewView ? 'first reviews scheduled' : 'scheduled reviews'}
          </span>
        </Card>
        {isFirstReviewView ? (
          <>
            <Card padding="sm" className="inline-flex items-center gap-2 border-rose-100 dark:border-rose-800">
              <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{stats.withPdf}</span>
              <span className="text-xs text-rose-700 dark:text-rose-300">Literature Survey</span>
            </Card>
            <Card padding="sm" className="inline-flex items-center gap-2 border-orange-100 dark:border-orange-800">
              <span className="text-lg font-bold text-orange-700 dark:text-orange-300">{stats.withPpt}</span>
              <span className="text-xs text-orange-700 dark:text-orange-300">First Review PPT</span>
            </Card>
            <Card padding="sm" className="inline-flex items-center gap-2 border-violet-100 dark:border-violet-800">
              <span className="text-lg font-bold text-violet-700 dark:text-violet-300">{stats.withReport}</span>
              <span className="text-xs text-violet-700 dark:text-violet-300">Review Report</span>
            </Card>
            <Card padding="sm" className="inline-flex items-center gap-2 border-sky-100 dark:border-sky-800">
              <span className="text-lg font-bold text-sky-700 dark:text-sky-300">{stats.withJournal}</span>
              <span className="text-xs text-sky-700 dark:text-sky-300">Journal Papers</span>
            </Card>
          </>
        ) : (
          <>
            <Card padding="sm" className="inline-flex items-center gap-2 border-emerald-100 dark:border-emerald-800">
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.withPdf}</span>
              <span className="text-xs text-emerald-700 dark:text-emerald-300">PDF uploaded</span>
            </Card>
            {!hidePptColumn && (
              <Card padding="sm" className="inline-flex items-center gap-2 border-sky-100 dark:border-sky-800">
                <span className="text-lg font-bold text-sky-700 dark:text-sky-300">{stats.withPpt}</span>
                <span className="text-xs text-sky-700 dark:text-sky-300">PPT uploaded</span>
              </Card>
            )}
          </>
        )}
      </div>

      <Card className="mb-4" padding="md">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
          <Select
            label="Supervisor"
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
          >
            <option value="">All supervisors</option>
            {supervisors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Reviewer"
            value={reviewerFilter}
            onChange={(e) => setReviewerFilter(e.target.value)}
          >
            <option value="">All reviewers</option>
            {reviewers.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select
            label="Review"
            value={reviewTitleFilter}
            onChange={(e) => {
              setReviewTitleFilter(e.target.value)
              setUploadFilter('')
            }}
          >
            <option value="">All reviews</option>
            {STANDARD_REVIEW_TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select label="Upload status" value={uploadFilter} onChange={(e) => setUploadFilter(e.target.value)}>
            <option value="">All statuses</option>
            {isFirstReviewView ? (
              <>
                <option value="all_uploaded">All 4 uploaded</option>
                <option value="incomplete">Missing any upload</option>
                <option value="missing:literature_survey">Literature Survey missing</option>
                <option value="missing:first_review_ppt">First Review PPT missing</option>
                <option value="missing:review_report">Review Report missing</option>
                <option value="missing:journal_papers">Journal Papers missing</option>
                <option value="none_scheduled">No First Review scheduled</option>
              </>
            ) : hidePptColumn ? (
              <>
                <option value="pdf_missing">PDF missing</option>
                <option value="both">PDF uploaded</option>
                <option value="none_scheduled">No review scheduled</option>
              </>
            ) : (
              <>
                <option value="both">PDF + PPT uploaded</option>
                <option value="incomplete">Missing PDF or PPT</option>
                <option value="pdf_missing">PDF missing</option>
                <option value="ppt_missing">PPT missing</option>
                <option value="none_scheduled">No review scheduled</option>
              </>
            )}
          </Select>
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Team / supervisor / student…"
            />
          </div>
          <Button variant="secondary" onClick={clearFilters}>
            Clear
          </Button>
          <Button
            variant="secondary"
            onClick={downloadZip}
            disabled={
              isLoading ||
              zipBusy ||
              (isFirstReviewView ? firstReviewZipCount === 0 : zipEntries.length === 0)
            }
            className="gap-1.5"
          >
            <FileArchive className="h-4 w-4" />
            {zipBusy
              ? `Zipping ${zipProgress ?? ''}…`
              : `Download ZIP (${isFirstReviewView ? firstReviewZipCount : zipEntries.length})`}
          </Button>
          <Button onClick={exportExcel} disabled={exportDisabled}>
            Export Excel
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={10} />
      ) : isFirstReviewView ? (
        <FirstReviewUploadsTable
          rows={firstReviewRows}
          showDelete={showDelete}
          onDeleted={invalidateTemplateUploads}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">PDF (abstract)</th>
                  {!hidePptColumn && <th className="px-4 py-3">PPT</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={hidePptColumn ? 5 : 6}
                      className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      No teams match these filters.
                    </td>
                  </tr>
                ) : (
                  filtered.flatMap(({ team, reviews: teamReviews }) => {
                    if (teamReviews.length === 0) {
                      return [
                        <tr key={team.id} className="bg-white dark:bg-app-surface">
                          <td className="px-4 py-3 font-mono font-semibold text-violet-700 dark:text-violet-300">
                            {team.batch_code}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{team.supervisor_name ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{team.reviewer_name ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-500" colSpan={hidePptColumn ? 2 : 3}>
                            No review scheduled
                          </td>
                        </tr>,
                      ]
                    }
                    return teamReviews.map(({ review, pdf, ppt }, idx) => (
                      <tr key={`${team.id}-${review.id}`} className="bg-white dark:bg-app-surface">
                        {idx === 0 && (
                          <>
                            <td className="px-4 py-3 font-mono font-semibold text-violet-700 dark:text-violet-300" rowSpan={teamReviews.length}>
                              {team.batch_code}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300" rowSpan={teamReviews.length}>
                              {team.supervisor_name ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300" rowSpan={teamReviews.length}>
                              {team.reviewer_name ?? '—'}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{review.review_title}</p>
                          <p className="text-xs text-slate-500">
                            {formatReviewSchedule(review.scheduled_at, review.scheduled_end_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {pdf ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <DownloadLink file={pdf} />
                                {showDelete && (
                                  <DeleteFileButton file={pdf} onDeleted={invalidateFiles} />
                                )}
                              </div>
                              <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-500">{pdf.original_filename}</p>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Missing</span>
                          )}
                        </td>
                        {!hidePptColumn && (
                          <td className="px-4 py-3">
                            {ppt ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <DownloadLink file={ppt} />
                                  {showDelete && (
                                    <DeleteFileButton file={ppt} onDeleted={invalidateFiles} />
                                  )}
                                </div>
                                <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-500">{ppt.original_filename}</p>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Missing</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}

function FirstReviewUploadsTable({
  rows,
  showDelete,
  onDeleted,
}: {
  rows: {
    team: TeamWithDetails
    review: TeamReview | null
    uploads: Record<TemplateType, TeamTemplateUpload | null>
  }[]
  showDelete: boolean
  onDeleted: () => void
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800/80">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3" rowSpan={2}>
                Team
              </th>
              <th className="px-4 py-3" rowSpan={2}>
                Supervisor
              </th>
              <th className="px-4 py-3" rowSpan={2}>
                Reviewer
              </th>
              <th className="px-4 py-3" rowSpan={2}>
                First Review
              </th>
              <th className="px-4 py-2 text-center" colSpan={TEMPLATE_CONFIGS.length}>
                Uploads
              </th>
            </tr>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {TEMPLATE_CONFIGS.map((cfg) => (
                <th key={cfg.type} className="px-4 py-2 font-semibold normal-case tracking-normal">
                  {cfg.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + TEMPLATE_CONFIGS.length}
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No teams match these filters.
                </td>
              </tr>
            ) : (
              rows.map(({ team, review, uploads }) => (
                <tr key={team.id} className="bg-white dark:bg-app-surface">
                  <td className="px-4 py-3 font-mono font-semibold text-violet-700 dark:text-violet-300">
                    {team.batch_code}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{team.supervisor_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{team.reviewer_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {review ? (
                      <>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{review.review_title}</p>
                        <p className="text-xs text-slate-500">
                          {formatReviewSchedule(review.scheduled_at, review.scheduled_end_at)}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">Not scheduled</span>
                    )}
                  </td>
                  {FIRST_REVIEW_UPLOAD_TYPES.map((type) => (
                    <td key={type} className="px-4 py-3">
                      <TemplateUploadCell
                        upload={uploads[type]}
                        showDelete={showDelete}
                        onDeleted={onDeleted}
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
