import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  fetchAllCoordinatorTeams,
  fetchAllProgressiveReviewMarks,
  fetchAllStudentReviewMarks,
  fetchAllTeamReviews,
} from '@/lib/coordinatorData'
import {
  PROGRESSIVE_REVIEW_TOTAL_MAX,
  REVIEW_SLOT_OPTIONS,
  ZEROTH_REVIEW_TOTAL_MAX,
  indexProgressiveMarks,
  indexStudentMarks,
  isProgressiveReviewSlot,
  marksKey,
  matchReviewSlot,
  type ReviewSlot,
} from '@/lib/reviewMarks'
import { sortTeamMembers } from '@/lib/teamSort'
import { teamBatchOptions, uniqueSorted } from '@/lib/teamFilters'

type ZerothMarkRow = {
  kind: 'zeroth'
  teamCode: string
  batchId: string
  supervisor: string
  reviewer: string
  studentName: string
  regNo: string
  aS: number | null
  bS: number | null
  cS: number | null
  totalS: number | null
  aR: number | null
  bR: number | null
  cR: number | null
  totalR: number | null
}

type ProgressiveMarkRow = {
  kind: 'progressive'
  teamCode: string
  batchId: string
  supervisor: string
  reviewer: string
  studentName: string
  regNo: string
  aS: number | null
  bS: number | null
  cS: number | null
  dS: number | null
  totalS: number | null
  aR: number | null
  bR: number | null
  cR: number | null
  dR: number | null
  totalR: number | null
}

type MarkRow = ZerothMarkRow | ProgressiveMarkRow

export function ReviewMarksPanel({ exportPrefix = 'review-marks' }: { exportPrefix?: string } = {}) {
  const [reviewSlot, setReviewSlot] = useState<ReviewSlot>('0th')
  const [batchFilter, setBatchFilter] = useState('')
  const [supervisorFilter, setSupervisorFilter] = useState('')
  const [reviewerFilter, setReviewerFilter] = useState('')
  const [markStatusFilter, setMarkStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const progressive = isProgressiveReviewSlot(reviewSlot)

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['coordinator-teams'],
    queryFn: fetchAllCoordinatorTeams,
  })
  const { data: allReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['coordinator-all-team-reviews'],
    queryFn: fetchAllTeamReviews,
  })
  const { data: zerothMarks = [], isLoading: zerothMarksLoading } = useQuery({
    queryKey: ['coordinator-all-student-marks'],
    queryFn: fetchAllStudentReviewMarks,
    enabled: !progressive,
  })
  const { data: progressiveMarks = [], isLoading: progressiveMarksLoading } = useQuery({
    queryKey: ['coordinator-all-progressive-marks'],
    queryFn: fetchAllProgressiveReviewMarks,
    enabled: progressive,
  })

  const isLoading =
    teamsLoading ||
    reviewsLoading ||
    (progressive ? progressiveMarksLoading : zerothMarksLoading)

  const batches = useMemo(() => teamBatchOptions(teams), [teams])
  const supervisors = useMemo(() => uniqueSorted(teams.map((t) => t.supervisor_name)), [teams])
  const reviewers = useMemo(() => uniqueSorted(teams.map((t) => t.reviewer_name)), [teams])

  const reviewByTeam = useMemo(() => {
    const map = new Map<string, (typeof allReviews)[0]>()
    for (const r of allReviews) {
      if (!matchReviewSlot(r.review_title, reviewSlot)) continue
      const existing = map.get(r.team_id)
      if (!existing || new Date(r.scheduled_at).getTime() >= new Date(existing.scheduled_at).getTime()) {
        map.set(r.team_id, r)
      }
    }
    return map
  }, [allReviews, reviewSlot])

  const zerothIndex = useMemo(() => indexStudentMarks(zerothMarks), [zerothMarks])
  const progressiveIndex = useMemo(() => indexProgressiveMarks(progressiveMarks), [progressiveMarks])

  const rows = useMemo(() => {
    const out: MarkRow[] = []

    for (const team of teams) {
      const review = reviewByTeam.get(team.id)
      const members = sortTeamMembers(team.team_members ?? [])
      for (const member of members) {
        if (progressive) {
          const sup = review ? progressiveIndex[marksKey(member.id, 'supervisor')] : undefined
          const rev = review ? progressiveIndex[marksKey(member.id, 'reviewer')] : undefined
          out.push({
            kind: 'progressive',
            teamCode: team.batch_code,
            batchId: team.batch_id,
            supervisor: team.supervisor_name ?? '—',
            reviewer: team.reviewer_name ?? '—',
            studentName: member.name,
            regNo: member.reg_no,
            aS: sup ? Number(sup.literature_survey) : null,
            bS: sup ? Number(sup.first_review_ppt) : null,
            cS: sup ? Number(sup.review_report) : null,
            dS: sup ? Number(sup.journal_papers) : null,
            totalS: sup ? Number(sup.total) : null,
            aR: rev ? Number(rev.literature_survey) : null,
            bR: rev ? Number(rev.first_review_ppt) : null,
            cR: rev ? Number(rev.review_report) : null,
            dR: rev ? Number(rev.journal_papers) : null,
            totalR: rev ? Number(rev.total) : null,
          })
        } else {
          const sup = review ? zerothIndex[marksKey(member.id, 'supervisor')] : undefined
          const rev = review ? zerothIndex[marksKey(member.id, 'reviewer')] : undefined
          out.push({
            kind: 'zeroth',
            teamCode: team.batch_code,
            batchId: team.batch_id,
            supervisor: team.supervisor_name ?? '—',
            reviewer: team.reviewer_name ?? '—',
            studentName: member.name,
            regNo: member.reg_no,
            aS: sup ? Number(sup.novelty_idea) : null,
            bS: sup ? Number(sup.abstract_content) : null,
            cS: sup ? Number(sup.sdg_goal_mapping) : null,
            totalS: sup ? Number(sup.total) : null,
            aR: rev ? Number(rev.novelty_idea) : null,
            bR: rev ? Number(rev.abstract_content) : null,
            cR: rev ? Number(rev.sdg_goal_mapping) : null,
            totalR: rev ? Number(rev.total) : null,
          })
        }
      }
    }
    return out
  }, [teams, reviewByTeam, progressive, zerothIndex, progressiveIndex])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (batchFilter && r.batchId !== batchFilter) return false
      if (supervisorFilter && r.supervisor !== supervisorFilter) return false
      if (reviewerFilter && r.reviewer !== reviewerFilter) return false

      if (markStatusFilter === 'both' && (r.totalS == null || r.totalR == null)) return false
      if (markStatusFilter === 'supervisor_only' && (r.totalS == null || r.totalR != null)) return false
      if (markStatusFilter === 'reviewer_only' && (r.totalR == null || r.totalS != null)) return false
      if (markStatusFilter === 'supervisor_missing' && r.totalS != null) return false
      if (markStatusFilter === 'reviewer_missing' && r.totalR != null) return false
      if (markStatusFilter === 'neither' && (r.totalS != null || r.totalR != null)) return false

      if (!term) return true
      return (
        r.teamCode.toLowerCase().includes(term) ||
        r.studentName.toLowerCase().includes(term) ||
        r.regNo.toLowerCase().includes(term) ||
        r.supervisor.toLowerCase().includes(term) ||
        r.reviewer.toLowerCase().includes(term)
      )
    })
  }, [rows, batchFilter, supervisorFilter, reviewerFilter, markStatusFilter, search])

  const stats = useMemo(() => {
    const withSup = filtered.filter((r) => r.totalS != null).length
    const withRev = filtered.filter((r) => r.totalR != null).length
    const supTotal = filtered.reduce((sum, r) => sum + (r.totalS ?? 0), 0)
    const revTotal = filtered.reduce((sum, r) => sum + (r.totalR ?? 0), 0)
    const supAvg = withSup > 0 ? supTotal / withSup : 0
    const revAvg = withRev > 0 ? revTotal / withRev : 0
    const overallAvg = withSup > 0 && withRev > 0 ? (supAvg + revAvg) / 2 : 0

    return {
      students: filtered.length,
      withSup,
      withRev,
      supTotal,
      revTotal,
      supAvg: supAvg.toFixed(2),
      revAvg: revAvg.toFixed(2),
      overallAvg: overallAvg.toFixed(2),
    }
  }, [filtered])

  const clearFilters = () => {
    setBatchFilter('')
    setSupervisorFilter('')
    setReviewerFilter('')
    setMarkStatusFilter('')
    setSearch('')
  }

  const slotLabel = REVIEW_SLOT_OPTIONS.find((o) => o.value === reviewSlot)?.label ?? reviewSlot
  const maxTotal = progressive ? PROGRESSIVE_REVIEW_TOTAL_MAX : ZEROTH_REVIEW_TOTAL_MAX

  const exportExcel = () => {
    const exportRows = filtered.map((r) => {
      if (r.kind === 'progressive') {
        return {
          Review: slotLabel,
          'Team ID': r.teamCode,
          Student: r.studentName,
          'Reg No': r.regNo,
          Supervisor: r.supervisor,
          Reviewer: r.reviewer,
          'Sup Literature Survey': r.aS ?? '',
          'Sup First Review PPT': r.bS ?? '',
          'Sup Review Report': r.cS ?? '',
          'Sup Journal Papers': r.dS ?? '',
          'Sup Total': r.totalS ?? '',
          'Rev Literature Survey': r.aR ?? '',
          'Rev First Review PPT': r.bR ?? '',
          'Rev Review Report': r.cR ?? '',
          'Rev Journal Papers': r.dR ?? '',
          'Rev Total': r.totalR ?? '',
        }
      }
      return {
        Review: slotLabel,
        'Team ID': r.teamCode,
        Student: r.studentName,
        'Reg No': r.regNo,
        Supervisor: r.supervisor,
        Reviewer: r.reviewer,
        'Sup Novelty': r.aS ?? '',
        'Sup Abstract': r.bS ?? '',
        'Sup SDG': r.cS ?? '',
        'Sup Total': r.totalS ?? '',
        'Rev Novelty': r.aR ?? '',
        'Rev Abstract': r.bR ?? '',
        'Rev SDG': r.cR ?? '',
        'Rev Total': r.totalR ?? '',
      }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'Marks')
    XLSX.writeFile(
      wb,
      `${exportPrefix}-${reviewSlot}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
    toast.success('Marks report downloaded')
  }

  const cell = (v: number | null) =>
    v == null ? <span className="text-slate-400">—</span> : <span className="font-semibold">{v}</span>

  const colSpan = progressive ? 16 : 14

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Select
          label="Review"
          value={reviewSlot}
          onChange={(e) => setReviewSlot(e.target.value as ReviewSlot)}
        >
          {REVIEW_SLOT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <p className="pb-2 text-sm text-slate-600 dark:text-slate-300">
          {slotLabel} · supervisor and reviewer scores per student (max {maxTotal} each)
          {progressive
            ? ' · Literature Survey, First Review PPT, Review Report, Journal Papers'
            : ' · Novelty, Abstract, SDG'}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Card padding="sm" className="inline-flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.students}</span>
          <span className="text-xs text-slate-500">students shown</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-violet-100 dark:border-violet-800">
          <span className="text-lg font-bold text-violet-700 dark:text-violet-300">{stats.withSup}</span>
          <span className="text-xs text-violet-700 dark:text-violet-300">supervisor marked</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-sky-100 dark:border-sky-800">
          <span className="text-lg font-bold text-sky-700 dark:text-sky-300">{stats.withRev}</span>
          <span className="text-xs text-sky-700 dark:text-sky-300">reviewer marked</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-emerald-100 dark:border-emerald-800">
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.supTotal}</span>
          <span className="text-xs text-emerald-700 dark:text-emerald-300">supervisor total</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-amber-100 dark:border-amber-800">
          <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{stats.revTotal}</span>
          <span className="text-xs text-amber-700 dark:text-amber-300">reviewer total</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-rose-100 dark:border-rose-800">
          <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{stats.supAvg}</span>
          <span className="text-xs text-rose-700 dark:text-rose-300">supervisor avg</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-indigo-100 dark:border-indigo-800">
          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{stats.revAvg}</span>
          <span className="text-xs text-indigo-700 dark:text-indigo-300">reviewer avg</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-purple-100 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/50">
          <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.overallAvg}</span>
          <span className="text-xs text-purple-700 dark:text-purple-300">overall avg</span>
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
            label="Mark status"
            value={markStatusFilter}
            onChange={(e) => setMarkStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="both">Both marked</option>
            <option value="supervisor_only">Supervisor only</option>
            <option value="reviewer_only">Reviewer only</option>
            <option value="supervisor_missing">Supervisor missing</option>
            <option value="reviewer_missing">Reviewer missing</option>
            <option value="neither">Neither marked</option>
          </Select>
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Team / student / faculty…"
            />
          </div>
          <Button variant="secondary" onClick={clearFilters}>
            Clear
          </Button>
          <Button onClick={exportExcel} disabled={isLoading || filtered.length === 0}>
            Export Excel
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={12} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-3">Team</th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Reg No</th>
                  <th className="px-3 py-3">Supervisor</th>
                  <th className="px-3 py-3">Reviewer</th>
                  <th className="px-3 py-3 text-center" colSpan={progressive ? 5 : 4}>
                    Supervisor marks
                  </th>
                  <th className="px-3 py-3 text-center" colSpan={progressive ? 5 : 4}>
                    Reviewer marks
                  </th>
                  <th className="px-3 py-3 text-center">Average</th>
                </tr>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="px-3 py-1" colSpan={5} />
                  {progressive ? (
                    <>
                      <th className="px-2 py-1 text-center">Lit</th>
                      <th className="px-2 py-1 text-center">PPT</th>
                      <th className="px-2 py-1 text-center">Rep</th>
                      <th className="px-2 py-1 text-center">Jrn</th>
                      <th className="px-2 py-1 text-center">Tot</th>
                      <th className="px-2 py-1 text-center">Lit</th>
                      <th className="px-2 py-1 text-center">PPT</th>
                      <th className="px-2 py-1 text-center">Rep</th>
                      <th className="px-2 py-1 text-center">Jrn</th>
                      <th className="px-2 py-1 text-center">Tot</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1 text-center">Nov</th>
                      <th className="px-2 py-1 text-center">Abs</th>
                      <th className="px-2 py-1 text-center">SDG</th>
                      <th className="px-2 py-1 text-center">Tot</th>
                      <th className="px-2 py-1 text-center">Nov</th>
                      <th className="px-2 py-1 text-center">Abs</th>
                      <th className="px-2 py-1 text-center">SDG</th>
                      <th className="px-2 py-1 text-center">Tot</th>
                    </>
                  )}
                  <th className="px-2 py-1 text-center">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No students match these filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={`${reviewSlot}-${r.teamCode}-${r.regNo}`} className="bg-white dark:bg-app-surface">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-violet-700 dark:text-violet-300">
                        {r.teamCode}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{r.studentName}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{r.regNo}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{r.supervisor}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{r.reviewer}</td>
                      {r.kind === 'progressive' ? (
                        <>
                          <td className="px-2 py-2 text-center">{cell(r.aS)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.bS)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.cS)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.dS)}</td>
                          <td className="px-2 py-2 text-center text-violet-700 dark:text-violet-300">
                            {cell(r.totalS)}
                          </td>
                          <td className="px-2 py-2 text-center">{cell(r.aR)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.bR)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.cR)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.dR)}</td>
                          <td className="px-2 py-2 text-center text-sky-700 dark:text-sky-300">
                            {cell(r.totalR)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2 text-center">{cell(r.aS)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.bS)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.cS)}</td>
                          <td className="px-2 py-2 text-center text-violet-700 dark:text-violet-300">
                            {cell(r.totalS)}
                          </td>
                          <td className="px-2 py-2 text-center">{cell(r.aR)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.bR)}</td>
                          <td className="px-2 py-2 text-center">{cell(r.cR)}</td>
                          <td className="px-2 py-2 text-center text-sky-700 dark:text-sky-300">
                            {cell(r.totalR)}
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2 text-center font-bold text-purple-700 dark:text-purple-300">
                        {r.totalS != null && r.totalR != null ? (
                          ((r.totalS + r.totalR) / 2).toFixed(2)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
