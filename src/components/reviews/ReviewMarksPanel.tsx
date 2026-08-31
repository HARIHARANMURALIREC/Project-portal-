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
  getProgressiveRubricsForSlot,
  indexProgressiveMarks,
  indexStudentMarks,
  isProgressiveReviewSlot,
  marksKey,
  matchReviewSlot,
  progressiveRubricDescription,
  type ReviewSlot,
} from '@/lib/reviewMarks'
import { sortTeamMembers } from '@/lib/teamSort'
import { teamBatchOptions, uniqueSorted } from '@/lib/teamFilters'
import type { StudentProgressiveReviewMarks, StudentReviewMarks } from '@/types/database'

type ScoreBundle = {
  a: number | null
  b: number | null
  c: number | null
  d: number | null
  e: number | null
  total: number | null
}

type MarkRow = {
  kind: 'zeroth' | 'progressive'
  teamCode: string
  batchId: string
  supervisor: string
  reviewer: string
  studentName: string
  regNo: string
  supervisorScores: ScoreBundle
  reviewerScores: ScoreBundle
}

function emptyScores(): ScoreBundle {
  return { a: null, b: null, c: null, d: null, e: null, total: null }
}

function fromZeroth(marks: StudentReviewMarks | undefined): ScoreBundle {
  if (!marks) return emptyScores()
  return {
    a: Number(marks.novelty_idea),
    b: Number(marks.abstract_content),
    c: Number(marks.sdg_goal_mapping),
    d: null,
    e: null,
    total: Number(marks.total),
  }
}

function fromProgressive(marks: StudentProgressiveReviewMarks | undefined): ScoreBundle {
  if (!marks) return emptyScores()
  return {
    a: Number(marks.feasibility),
    b: Number(marks.proposed_methodology),
    c: Number(marks.background),
    d: Number(marks.literature_survey),
    e: Number(marks.reference_paper),
    total: Number(marks.total),
  }
}

/** Faculty reviewer marks (legacy `reviewer` + `internal_reviewer`). */
function pickReviewerZeroth(
  index: Record<string, StudentReviewMarks>,
  memberId: string,
): StudentReviewMarks | undefined {
  return index[marksKey(memberId, 'internal_reviewer')] ?? index[marksKey(memberId, 'reviewer')]
}

function pickReviewerProgressive(
  index: Record<string, StudentProgressiveReviewMarks>,
  memberId: string,
): StudentProgressiveReviewMarks | undefined {
  return index[marksKey(memberId, 'internal_reviewer')] ?? index[marksKey(memberId, 'reviewer')]
}

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
    teamsLoading || reviewsLoading || (progressive ? progressiveMarksLoading : zerothMarksLoading)

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
          const rev = review ? pickReviewerProgressive(progressiveIndex, member.id) : undefined
          out.push({
            kind: 'progressive',
            teamCode: team.batch_code,
            batchId: team.batch_id,
            supervisor: team.supervisor_name ?? '—',
            reviewer: team.reviewer_name ?? '—',
            studentName: member.name,
            regNo: member.reg_no,
            supervisorScores: fromProgressive(sup),
            reviewerScores: fromProgressive(rev),
          })
        } else {
          const sup = review ? zerothIndex[marksKey(member.id, 'supervisor')] : undefined
          const rev = review ? pickReviewerZeroth(zerothIndex, member.id) : undefined
          out.push({
            kind: 'zeroth',
            teamCode: team.batch_code,
            batchId: team.batch_id,
            supervisor: team.supervisor_name ?? '—',
            reviewer: team.reviewer_name ?? '—',
            studentName: member.name,
            regNo: member.reg_no,
            supervisorScores: fromZeroth(sup),
            reviewerScores: fromZeroth(rev),
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

      const hasSup = r.supervisorScores.total != null
      const hasRev = r.reviewerScores.total != null

      if (markStatusFilter === 'both' && !(hasSup && hasRev)) return false
      if (markStatusFilter === 'supervisor_only' && !(hasSup && !hasRev)) return false
      if (markStatusFilter === 'reviewer_only' && !(!hasSup && hasRev)) return false
      if (markStatusFilter === 'supervisor_missing' && hasSup) return false
      if (markStatusFilter === 'reviewer_missing' && hasRev) return false
      if (markStatusFilter === 'neither' && (hasSup || hasRev)) return false

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
    const withSup = filtered.filter((r) => r.supervisorScores.total != null).length
    const withRev = filtered.filter((r) => r.reviewerScores.total != null).length
    const supTotal = filtered.reduce((sum, r) => sum + (r.supervisorScores.total ?? 0), 0)
    const revTotal = filtered.reduce((sum, r) => sum + (r.reviewerScores.total ?? 0), 0)
    const supAvg = withSup > 0 ? supTotal / withSup : 0
    const revAvg = withRev > 0 ? revTotal / withRev : 0

    let overallSum = 0
    let overallCount = 0
    for (const r of filtered) {
      const parts = [r.supervisorScores.total, r.reviewerScores.total].filter(
        (v): v is number => v != null,
      )
      if (parts.length > 0) {
        overallSum += parts.reduce((a, b) => a + b, 0) / parts.length
        overallCount += 1
      }
    }

    return {
      students: filtered.length,
      withSup,
      withRev,
      supAvg: supAvg.toFixed(2),
      revAvg: revAvg.toFixed(2),
      overallAvg: overallCount > 0 ? (overallSum / overallCount).toFixed(2) : '0.00',
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
  const progressiveRubrics = useMemo(
    () => (progressive ? getProgressiveRubricsForSlot(reviewSlot) : []),
    [progressive, reviewSlot],
  )

  const exportExcel = () => {
    const exportRows = filtered.map((r) => {
      if (r.kind === 'progressive') {
        const row: Record<string, string | number> = {
          Review: slotLabel,
          'Team ID': r.teamCode,
          Student: r.studentName,
          'Reg No': r.regNo,
          Supervisor: r.supervisor,
          'Assigned Reviewer': r.reviewer,
        }
        progressiveRubrics.forEach((rub, i) => {
          const scoreKey = ['a', 'b', 'c', 'd', 'e'][i] as 'a' | 'b' | 'c' | 'd' | 'e'
          row[`Sup ${rub.label}`] = r.supervisorScores[scoreKey] ?? ''
          row[`Rev ${rub.label}`] = r.reviewerScores[scoreKey] ?? ''
        })
        row['Sup Total'] = r.supervisorScores.total ?? ''
        row['Rev Total'] = r.reviewerScores.total ?? ''
        return row
      }
      return {
        Review: slotLabel,
        'Team ID': r.teamCode,
        Student: r.studentName,
        'Reg No': r.regNo,
        Supervisor: r.supervisor,
        'Assigned Reviewer': r.reviewer,
        'Sup Novelty': r.supervisorScores.a ?? '',
        'Sup Abstract': r.supervisorScores.b ?? '',
        'Sup SDG': r.supervisorScores.c ?? '',
        'Sup Total': r.supervisorScores.total ?? '',
        'Rev Novelty': r.reviewerScores.a ?? '',
        'Rev Abstract': r.reviewerScores.b ?? '',
        'Rev SDG': r.reviewerScores.c ?? '',
        'Rev Total': r.reviewerScores.total ?? '',
      }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'Marks')
    XLSX.writeFile(wb, `${exportPrefix}-${reviewSlot}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Marks report downloaded')
  }

  const cell = (v: number | null) =>
    v == null ? <span className="text-slate-400">—</span> : <span className="font-semibold">{v}</span>

  const renderScoreCells = (scores: ScoreBundle, totalClass: string) =>
    progressive ? (
      <>
        <td className="px-2 py-2 text-center">{cell(scores.a)}</td>
        <td className="px-2 py-2 text-center">{cell(scores.b)}</td>
        <td className="px-2 py-2 text-center">{cell(scores.c)}</td>
        <td className="px-2 py-2 text-center">{cell(scores.d)}</td>
        <td className="px-2 py-2 text-center">{cell(scores.e)}</td>
        <td className={`px-2 py-2 text-center ${totalClass}`}>{cell(scores.total)}</td>
      </>
    ) : (
      <>
        <td className="px-2 py-2 text-center">{cell(scores.a)}</td>
        <td className="px-2 py-2 text-center">{cell(scores.b)}</td>
        <td className="px-2 py-2 text-center">{cell(scores.c)}</td>
        <td className={`px-2 py-2 text-center ${totalClass}`}>{cell(scores.total)}</td>
      </>
    )

  const scoreColSpan = progressive ? 6 : 4
  const colSpan = 5 + scoreColSpan * 2 + 1

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
          {slotLabel} · supervisor and reviewer scores (max {maxTotal} each)
          {progressive ? ` · ${progressiveRubricDescription(reviewSlot)}` : ' · Novelty, Abstract, SDG'}
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
        <Card padding="sm" className="inline-flex items-center gap-2 border-indigo-100 dark:border-indigo-800">
          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{stats.withRev}</span>
          <span className="text-xs text-indigo-700 dark:text-indigo-300">reviewer marked</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-rose-100 dark:border-rose-800">
          <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{stats.supAvg}</span>
          <span className="text-xs text-rose-700 dark:text-rose-300">supervisor avg</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-fuchsia-100 dark:border-fuchsia-800">
          <span className="text-lg font-bold text-fuchsia-700 dark:text-fuchsia-300">{stats.revAvg}</span>
          <span className="text-xs text-fuchsia-700 dark:text-fuchsia-300">reviewer avg</span>
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
            <option value="both">Supervisor + reviewer</option>
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
                  <th className="px-3 py-3">Assigned reviewer</th>
                  <th className="px-3 py-3 text-center" colSpan={scoreColSpan}>
                    Supervisor marks
                  </th>
                  <th className="px-3 py-3 text-center" colSpan={scoreColSpan}>
                    Reviewer marks
                  </th>
                  <th className="px-3 py-3 text-center">Average</th>
                </tr>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="px-3 py-1" colSpan={5} />
                  {progressive ? (
                    <>
                      {progressiveRubrics.map((r) => (
                        <th key={`s-${r.key}`} className="px-2 py-1 text-center">
                          {r.short}
                        </th>
                      ))}
                      <th className="px-2 py-1 text-center">Tot</th>
                      {progressiveRubrics.map((r) => (
                        <th key={`r-${r.key}`} className="px-2 py-1 text-center">
                          {r.short}
                        </th>
                      ))}
                      <th className="px-2 py-1 text-center">Tot</th>
                    </>
                  ) : (
                    <>
                      {(['Nov', 'Abs', 'SDG', 'Tot'] as const).map((h) => (
                        <th key={`s-${h}`} className="px-2 py-1 text-center">
                          {h}
                        </th>
                      ))}
                      {(['Nov', 'Abs', 'SDG', 'Tot'] as const).map((h) => (
                        <th key={`r-${h}`} className="px-2 py-1 text-center">
                          {h}
                        </th>
                      ))}
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
                  filtered.map((r) => {
                    const parts = [r.supervisorScores.total, r.reviewerScores.total].filter(
                      (v): v is number => v != null,
                    )
                    const avg =
                      parts.length > 0
                        ? (parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(2)
                        : null
                    return (
                      <tr key={`${reviewSlot}-${r.teamCode}-${r.regNo}`} className="bg-white dark:bg-app-surface">
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-violet-700 dark:text-violet-300">
                          {r.teamCode}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{r.studentName}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{r.regNo}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{r.supervisor}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{r.reviewer}</td>
                        {renderScoreCells(r.supervisorScores, 'text-violet-700 dark:text-violet-300')}
                        {renderScoreCells(r.reviewerScores, 'text-indigo-700 dark:text-indigo-300')}
                        <td className="px-2 py-2 text-center font-bold text-purple-700 dark:text-purple-300">
                          {avg ?? <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    )
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
