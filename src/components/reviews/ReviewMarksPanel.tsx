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
  internalScores: ScoreBundle
  externalScores: ScoreBundle
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

function pickInternalZeroth(
  index: Record<string, StudentReviewMarks>,
  memberId: string,
): StudentReviewMarks | undefined {
  return index[marksKey(memberId, 'internal_reviewer')] ?? index[marksKey(memberId, 'reviewer')]
}

function pickExternalZeroth(
  index: Record<string, StudentReviewMarks>,
  memberId: string,
): StudentReviewMarks | undefined {
  return index[marksKey(memberId, 'external_reviewer')]
}

function pickInternalProgressive(
  index: Record<string, StudentProgressiveReviewMarks>,
  memberId: string,
): StudentProgressiveReviewMarks | undefined {
  return index[marksKey(memberId, 'internal_reviewer')] ?? index[marksKey(memberId, 'reviewer')]
}

function pickExternalProgressive(
  index: Record<string, StudentProgressiveReviewMarks>,
  memberId: string,
): StudentProgressiveReviewMarks | undefined {
  return index[marksKey(memberId, 'external_reviewer')]
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
          const internal = review ? pickInternalProgressive(progressiveIndex, member.id) : undefined
          const external = review ? pickExternalProgressive(progressiveIndex, member.id) : undefined
          out.push({
            kind: 'progressive',
            teamCode: team.batch_code,
            batchId: team.batch_id,
            supervisor: team.supervisor_name ?? '—',
            reviewer: team.reviewer_name ?? '—',
            studentName: member.name,
            regNo: member.reg_no,
            supervisorScores: fromProgressive(sup),
            internalScores: fromProgressive(internal),
            externalScores: fromProgressive(external),
          })
        } else {
          const sup = review ? zerothIndex[marksKey(member.id, 'supervisor')] : undefined
          const internal = review ? pickInternalZeroth(zerothIndex, member.id) : undefined
          const external = review ? pickExternalZeroth(zerothIndex, member.id) : undefined
          out.push({
            kind: 'zeroth',
            teamCode: team.batch_code,
            batchId: team.batch_id,
            supervisor: team.supervisor_name ?? '—',
            reviewer: team.reviewer_name ?? '—',
            studentName: member.name,
            regNo: member.reg_no,
            supervisorScores: fromZeroth(sup),
            internalScores: fromZeroth(internal),
            externalScores: fromZeroth(external),
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
      const hasInt = r.internalScores.total != null
      const hasExt = r.externalScores.total != null
      const hasAnyReviewer = hasInt || hasExt

      if (markStatusFilter === 'both' && !(hasSup && hasAnyReviewer)) return false
      if (markStatusFilter === 'supervisor_only' && !(hasSup && !hasAnyReviewer)) return false
      if (markStatusFilter === 'reviewer_only' && !(!hasSup && hasAnyReviewer)) return false
      if (markStatusFilter === 'internal_only' && !hasInt) return false
      if (markStatusFilter === 'external_only' && !hasExt) return false
      if (markStatusFilter === 'supervisor_missing' && hasSup) return false
      if (markStatusFilter === 'reviewer_missing' && hasAnyReviewer) return false
      if (markStatusFilter === 'neither' && (hasSup || hasAnyReviewer)) return false

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
    const withInt = filtered.filter((r) => r.internalScores.total != null).length
    const withExt = filtered.filter((r) => r.externalScores.total != null).length
    const withAnyRev = filtered.filter(
      (r) => r.internalScores.total != null || r.externalScores.total != null,
    ).length
    const supTotal = filtered.reduce((sum, r) => sum + (r.supervisorScores.total ?? 0), 0)
    const intTotal = filtered.reduce((sum, r) => sum + (r.internalScores.total ?? 0), 0)
    const extTotal = filtered.reduce((sum, r) => sum + (r.externalScores.total ?? 0), 0)
    const supAvg = withSup > 0 ? supTotal / withSup : 0
    const intAvg = withInt > 0 ? intTotal / withInt : 0
    const extAvg = withExt > 0 ? extTotal / withExt : 0

    let overallSum = 0
    let overallCount = 0
    for (const r of filtered) {
      const parts = [r.supervisorScores.total, r.internalScores.total, r.externalScores.total].filter(
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
      withInt,
      withExt,
      withAnyRev,
      supTotal,
      intTotal,
      extTotal,
      supAvg: supAvg.toFixed(2),
      intAvg: intAvg.toFixed(2),
      extAvg: extAvg.toFixed(2),
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

  const exportExcel = () => {
    const exportRows = filtered.map((r) => {
      if (r.kind === 'progressive') {
        return {
          Review: slotLabel,
          'Team ID': r.teamCode,
          Student: r.studentName,
          'Reg No': r.regNo,
          Supervisor: r.supervisor,
          'Assigned Reviewer': r.reviewer,
          'Sup Feasibility': r.supervisorScores.a ?? '',
          'Sup Proposed Methodology': r.supervisorScores.b ?? '',
          'Sup Background': r.supervisorScores.c ?? '',
          'Sup Literature Survey': r.supervisorScores.d ?? '',
          'Sup Reference Paper': r.supervisorScores.e ?? '',
          'Sup Total': r.supervisorScores.total ?? '',
          'Int Feasibility': r.internalScores.a ?? '',
          'Int Proposed Methodology': r.internalScores.b ?? '',
          'Int Background': r.internalScores.c ?? '',
          'Int Literature Survey': r.internalScores.d ?? '',
          'Int Reference Paper': r.internalScores.e ?? '',
          'Int Total': r.internalScores.total ?? '',
          'Ext Feasibility': r.externalScores.a ?? '',
          'Ext Proposed Methodology': r.externalScores.b ?? '',
          'Ext Background': r.externalScores.c ?? '',
          'Ext Literature Survey': r.externalScores.d ?? '',
          'Ext Reference Paper': r.externalScores.e ?? '',
          'Ext Total': r.externalScores.total ?? '',
        }
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
        'Int Novelty': r.internalScores.a ?? '',
        'Int Abstract': r.internalScores.b ?? '',
        'Int SDG': r.internalScores.c ?? '',
        'Int Total': r.internalScores.total ?? '',
        'Ext Novelty': r.externalScores.a ?? '',
        'Ext Abstract': r.externalScores.b ?? '',
        'Ext SDG': r.externalScores.c ?? '',
        'Ext Total': r.externalScores.total ?? '',
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
  const colSpan = 5 + scoreColSpan * 3 + 1

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
          {slotLabel} · supervisor, internal reviewer, and external reviewer scores (max {maxTotal} each)
          {progressive
            ? ' · Feasibility, Proposed Methodology, Background, Literature Survey, Reference Paper'
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
        <Card padding="sm" className="inline-flex items-center gap-2 border-indigo-100 dark:border-indigo-800">
          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{stats.withInt}</span>
          <span className="text-xs text-indigo-700 dark:text-indigo-300">internal marked</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-sky-100 dark:border-sky-800">
          <span className="text-lg font-bold text-sky-700 dark:text-sky-300">{stats.withExt}</span>
          <span className="text-xs text-sky-700 dark:text-sky-300">external marked</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-rose-100 dark:border-rose-800">
          <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{stats.supAvg}</span>
          <span className="text-xs text-rose-700 dark:text-rose-300">supervisor avg</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-fuchsia-100 dark:border-fuchsia-800">
          <span className="text-lg font-bold text-fuchsia-700 dark:text-fuchsia-300">{stats.intAvg}</span>
          <span className="text-xs text-fuchsia-700 dark:text-fuchsia-300">internal avg</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-cyan-100 dark:border-cyan-800">
          <span className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{stats.extAvg}</span>
          <span className="text-xs text-cyan-700 dark:text-cyan-300">external avg</span>
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
            <option value="both">Supervisor + any reviewer</option>
            <option value="supervisor_only">Supervisor only</option>
            <option value="reviewer_only">Any reviewer only</option>
            <option value="internal_only">Internal reviewer marked</option>
            <option value="external_only">External reviewer marked</option>
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
                  <th className="px-3 py-3 text-center" colSpan={scoreColSpan}>
                    Supervisor marks
                  </th>
                  <th className="px-3 py-3 text-center" colSpan={scoreColSpan}>
                    Internal reviewer marks
                  </th>
                  <th className="px-3 py-3 text-center" colSpan={scoreColSpan}>
                    External reviewer marks
                  </th>
                  <th className="px-3 py-3 text-center">Average</th>
                </tr>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="px-3 py-1" colSpan={5} />
                  {progressive ? (
                    <>
                      {(['Fea', 'Met', 'Bkg', 'Lit', 'Ref', 'Tot'] as const).map((h) => (
                        <th key={`s-${h}`} className="px-2 py-1 text-center">
                          {h}
                        </th>
                      ))}
                      {(['Fea', 'Met', 'Bkg', 'Lit', 'Ref', 'Tot'] as const).map((h) => (
                        <th key={`i-${h}`} className="px-2 py-1 text-center">
                          {h}
                        </th>
                      ))}
                      {(['Fea', 'Met', 'Bkg', 'Lit', 'Ref', 'Tot'] as const).map((h) => (
                        <th key={`e-${h}`} className="px-2 py-1 text-center">
                          {h}
                        </th>
                      ))}
                    </>
                  ) : (
                    <>
                      {(['Nov', 'Abs', 'SDG', 'Tot'] as const).map((h) => (
                        <th key={`s-${h}`} className="px-2 py-1 text-center">
                          {h}
                        </th>
                      ))}
                      {(['Nov', 'Abs', 'SDG', 'Tot'] as const).map((h) => (
                        <th key={`i-${h}`} className="px-2 py-1 text-center">
                          {h}
                        </th>
                      ))}
                      {(['Nov', 'Abs', 'SDG', 'Tot'] as const).map((h) => (
                        <th key={`e-${h}`} className="px-2 py-1 text-center">
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
                    const parts = [
                      r.supervisorScores.total,
                      r.internalScores.total,
                      r.externalScores.total,
                    ].filter((v): v is number => v != null)
                    const avg = parts.length > 0 ? (parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(2) : null
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
                        {renderScoreCells(r.internalScores, 'text-indigo-700 dark:text-indigo-300')}
                        {renderScoreCells(r.externalScores, 'text-sky-700 dark:text-sky-300')}
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
