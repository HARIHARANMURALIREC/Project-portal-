import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  fetchAllCoordinatorTeams,
  fetchAllReviewFiles,
  fetchAllTeamReviews,
} from '@/lib/coordinatorData'
import { getReviewFileDownloadUrl } from '@/lib/reviewFiles'
import { formatReviewDateTime } from '@/lib/reviews'
import { sortTeamMembers } from '@/lib/teamSort'
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

export function CoordinatorUploads() {
  const [q, setQ] = useState('')

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
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(({ team }) => {
      const members = sortTeamMembers(team.team_members ?? [])
        .map((m) => `${m.name} ${m.reg_no}`)
        .join(' ')
        .toLowerCase()
      return (
        team.batch_code.toLowerCase().includes(term) ||
        (team.supervisor_name ?? '').toLowerCase().includes(term) ||
        (team.reviewer_name ?? '').toLowerCase().includes(term) ||
        members.includes(term)
      )
    })
  }, [rows, q])

  const stats = useMemo(() => {
    let withPdf = 0
    let withPpt = 0
    let scheduled = 0
    for (const row of rows) {
      for (const r of row.reviews) {
        scheduled += 1
        if (r.pdf) withPdf += 1
        if (r.ppt) withPpt += 1
      }
    }
    return { scheduled, withPdf, withPpt }
  }, [rows])

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
    XLSX.writeFile(wb, `coordinator-uploads-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Upload report downloaded')
  }

  return (
    <CoordinatorPageShell title="Review Uploads" activeNav="uploads">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        PDF and PPT uploads for every team. Download files and export status to Excel.
      </p>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
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
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search team / supervisor / student"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button onClick={exportExcel} disabled={isLoading || filtered.length === 0}>
            Export Excel
          </Button>
        </div>
      </div>

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
                      No teams match.
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
                        <td className="px-4 py-3 font-mono font-semibold text-violet-700 dark:text-violet-300">
                          {idx === 0 ? team.batch_code : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {idx === 0 ? (team.supervisor_name ?? '—') : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {idx === 0 ? (team.reviewer_name ?? '—') : ''}
                        </td>
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
    </CoordinatorPageShell>
  )
}
