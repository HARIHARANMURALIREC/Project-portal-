import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileArchive } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  fetchAllCoordinatorTeams,
  fetchAllReviewFiles,
  fetchAllTeamReviews,
} from '@/lib/coordinatorData'
import {
  buildReviewFilesZip,
  getReviewFileDownloadUrl,
  triggerBlobDownload,
  type ZipReviewFileEntry,
} from '@/lib/reviewFiles'
import { formatReviewDateTime } from '@/lib/reviews'
import { teamBatchOptions, teamMatchesFilters, uniqueSorted } from '@/lib/teamFilters'
import type { TeamReviewFile } from '@/types/database'

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

export function ReviewUploadsPanel({ exportPrefix = 'review-uploads' }: { exportPrefix?: string } = {}) {
  const [batchFilter, setBatchFilter] = useState('')
  const [supervisorFilter, setSupervisorFilter] = useState('')
  const [reviewerFilter, setReviewerFilter] = useState('')
  const [reviewTitleFilter, setReviewTitleFilter] = useState('')
  const [uploadFilter, setUploadFilter] = useState('')
  const [search, setSearch] = useState('')
  const [zipBusy, setZipBusy] = useState(false)
  const [zipProgress, setZipProgress] = useState<string | null>(null)

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['coordinator-teams'],
    queryFn: fetchAllCoordinatorTeams,
  })
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['coordinator-all-reviews'],
    queryFn: fetchAllTeamReviews,
  })
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['coordinator-all-review-files'],
    queryFn: fetchAllReviewFiles,
  })

  const isLoading = teamsLoading || reviewsLoading || filesLoading

  const batches = useMemo(() => teamBatchOptions(teams), [teams])
  const supervisors = useMemo(() => uniqueSorted(teams.map((t) => t.supervisor_name)), [teams])
  const reviewers = useMemo(() => uniqueSorted(teams.map((t) => t.reviewer_name)), [teams])
  const reviewTitles = useMemo(() => uniqueSorted(reviews.map((r) => r.review_title)), [reviews])

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
          nextReviews = nextReviews.filter((r) => r.pdf && r.ppt)
        } else if (uploadFilter === 'incomplete') {
          nextReviews = nextReviews.filter((r) => !r.pdf || !r.ppt)
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
  }, [rows, batchFilter, supervisorFilter, reviewerFilter, reviewTitleFilter, uploadFilter, search])

  const stats = useMemo(() => {
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
    return { scheduled, withPdf, withPpt, teams: filtered.length }
  }, [filtered])

  const clearFilters = () => {
    setBatchFilter('')
    setSupervisorFilter('')
    setReviewerFilter('')
    setReviewTitleFilter('')
    setUploadFilter('')
    setSearch('')
  }

  const zipEntries = useMemo((): ZipReviewFileEntry[] => {
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
        if (ppt) {
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
  }, [filtered])

  const exportExcel = () => {
    const exportRows = filtered.flatMap(({ team, reviews: teamReviews }) => {
      if (teamReviews.length === 0) {
        return [
          {
            'Team ID': team.batch_code,
            Supervisor: team.supervisor_name ?? '',
            Reviewer: team.reviewer_name ?? '',
            Review: '—',
            PDF: 'No',
            PPT: 'No',
            'PDF filename': '',
            'PPT filename': '',
          },
        ]
      }
      return teamReviews.map(({ review, pdf, ppt }) => ({
        'Team ID': team.batch_code,
        Supervisor: team.supervisor_name ?? '',
        Reviewer: team.reviewer_name ?? '',
        Review: review.review_title,
        Scheduled: formatReviewDateTime(review.scheduled_at),
        PDF: pdf ? 'Yes' : 'No',
        PPT: ppt ? 'Yes' : 'No',
        'PDF filename': pdf?.original_filename ?? '',
        'PPT filename': ppt?.original_filename ?? '',
      }))
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'Uploads')
    XLSX.writeFile(wb, `${exportPrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Upload report downloaded')
  }

  const downloadZip = () => {
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

  return (
    <>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        PDF and PPT uploads for every team. Download individual files, pack filtered uploads as a ZIP, or
        export status to Excel.
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        <Card padding="sm" className="inline-flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.teams}</span>
          <span className="text-xs text-slate-500">teams shown</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.scheduled}</span>
          <span className="text-xs text-slate-500">scheduled reviews</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-emerald-100 dark:border-emerald-800">
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.withPdf}</span>
          <span className="text-xs text-emerald-700 dark:text-emerald-300">PDF uploaded</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-sky-100 dark:border-sky-800">
          <span className="text-lg font-bold text-sky-700 dark:text-sky-300">{stats.withPpt}</span>
          <span className="text-xs text-sky-700 dark:text-sky-300">PPT uploaded</span>
        </Card>
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
            onChange={(e) => setReviewTitleFilter(e.target.value)}
          >
            <option value="">All reviews</option>
            {reviewTitles.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select label="Upload status" value={uploadFilter} onChange={(e) => setUploadFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="both">PDF + PPT uploaded</option>
            <option value="incomplete">Missing PDF or PPT</option>
            <option value="pdf_missing">PDF missing</option>
            <option value="ppt_missing">PPT missing</option>
            <option value="none_scheduled">No review scheduled</option>
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
            disabled={isLoading || zipBusy || zipEntries.length === 0}
            className="gap-1.5"
          >
            <FileArchive className="h-4 w-4" />
            {zipBusy ? `Zipping ${zipProgress ?? ''}…` : `Download ZIP (${zipEntries.length})`}
          </Button>
          <Button onClick={exportExcel} disabled={isLoading || filtered.length === 0}>
            Export Excel
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={10} />
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
                  <th className="px-4 py-3">PPT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
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
                          <td className="px-4 py-3 text-slate-500" colSpan={3}>
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
                          <p className="text-xs text-slate-500">{formatReviewDateTime(review.scheduled_at)}</p>
                        </td>
                        <td className="px-4 py-3">
                          {pdf ? (
                            <div>
                              <DownloadLink file={pdf} />
                              <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-500">{pdf.original_filename}</p>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Missing</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {ppt ? (
                            <div>
                              <DownloadLink file={ppt} />
                              <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-500">{ppt.original_filename}</p>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Missing</span>
                          )}
                        </td>
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
