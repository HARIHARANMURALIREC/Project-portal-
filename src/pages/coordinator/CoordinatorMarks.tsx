import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  fetchAllCoordinatorTeams,
  fetchAllStudentReviewMarks,
  fetchZerothReviews,
} from '@/lib/coordinatorData'
import { ZEROTH_REVIEW_TOTAL_MAX, marksKey, indexStudentMarks } from '@/lib/reviewMarks'
import { sortTeamMembers } from '@/lib/teamSort'
import { BATCH_COORDINATORS, BATCH_LABELS } from '@/lib/batchCoordinators'

export function CoordinatorMarks() {
  const [q, setQ] = useState('')
  const [selectedSection, setSelectedSection] = useState<string>('all')

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['coordinator-teams'],
    queryFn: fetchAllCoordinatorTeams,
  })
  const { data: zerothReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['coordinator-zeroth-reviews'],
    queryFn: fetchZerothReviews,
  })
  const { data: marks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['coordinator-all-student-marks'],
    queryFn: fetchAllStudentReviewMarks,
  })

  const isLoading = teamsLoading || reviewsLoading || marksLoading

  const filteredTeams = useMemo(
    () => selectedSection === 'all' 
      ? teams 
      : teams.filter((t) => t.batch_id === selectedSection),
    [teams, selectedSection],
  )

  const reviewByTeam = useMemo(() => {
    const map = new Map<string, (typeof zerothReviews)[0]>()
    for (const r of zerothReviews) map.set(r.team_id, r)
    return map
  }, [zerothReviews])

  const marksIndex = useMemo(() => indexStudentMarks(marks), [marks])

  const rows = useMemo(() => {
    const out: {
      teamCode: string
      supervisor: string
      reviewer: string
      studentName: string
      regNo: string
      noveltyS: number | null
      abstractS: number | null
      sdgS: number | null
      totalS: number | null
      noveltyR: number | null
      abstractR: number | null
      sdgR: number | null
      totalR: number | null
    }[] = []

    for (const team of filteredTeams) {
      const review = reviewByTeam.get(team.id)
      const members = sortTeamMembers(team.team_members ?? [])
      for (const member of members) {
        const sup = review ? marksIndex[marksKey(member.id, 'supervisor')] : undefined
        const rev = review ? marksIndex[marksKey(member.id, 'reviewer')] : undefined
        out.push({
          teamCode: team.batch_code,
          supervisor: team.supervisor_name ?? '—',
          reviewer: team.reviewer_name ?? '—',
          studentName: member.name,
          regNo: member.reg_no,
          noveltyS: sup ? Number(sup.novelty_idea) : null,
          abstractS: sup ? Number(sup.abstract_content) : null,
          sdgS: sup ? Number(sup.sdg_goal_mapping) : null,
          totalS: sup ? Number(sup.total) : null,
          noveltyR: rev ? Number(rev.novelty_idea) : null,
          abstractR: rev ? Number(rev.abstract_content) : null,
          sdgR: rev ? Number(rev.sdg_goal_mapping) : null,
          totalR: rev ? Number(rev.total) : null,
        })
      }
    }
    return out
  }, [filteredTeams, reviewByTeam, marksIndex])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(
      (r) =>
        r.teamCode.toLowerCase().includes(term) ||
        r.studentName.toLowerCase().includes(term) ||
        r.regNo.toLowerCase().includes(term) ||
        r.supervisor.toLowerCase().includes(term) ||
        r.reviewer.toLowerCase().includes(term),
    )
  }, [rows, q])

  const stats = useMemo(() => {
    const withSup = rows.filter((r) => r.totalS != null).length
    const withRev = rows.filter((r) => r.totalR != null).length
    
    const supTotal = rows.reduce((sum, r) => sum + (r.totalS ?? 0), 0)
    const revTotal = rows.reduce((sum, r) => sum + (r.totalR ?? 0), 0)
    
    const supAvg = withSup > 0 ? supTotal / withSup : 0
    const revAvg = withRev > 0 ? revTotal / withRev : 0
    const overallAvg = (supAvg + revAvg) / 2
    
    return { 
      students: rows.length, 
      withSup, 
      withRev,
      supTotal,
      revTotal,
      supAvg: supAvg.toFixed(2),
      revAvg: revAvg.toFixed(2),
      overallAvg: overallAvg.toFixed(2)
    }
  }, [rows])

  const exportExcel = () => {
    const exportRows = filtered.map((r) => ({
      'Team ID': r.teamCode,
      Student: r.studentName,
      'Reg No': r.regNo,
      Supervisor: r.supervisor,
      Reviewer: r.reviewer,
      'Sup Novelty': r.noveltyS ?? '',
      'Sup Abstract': r.abstractS ?? '',
      'Sup SDG': r.sdgS ?? '',
      'Sup Total': r.totalS ?? '',
      'Rev Novelty': r.noveltyR ?? '',
      'Rev Abstract': r.abstractR ?? '',
      'Rev SDG': r.sdgR ?? '',
      'Rev Total': r.totalR ?? '',
    }))
    const sectionLabel = selectedSection === 'all' ? 'all-sections' : BATCH_LABELS[selectedSection].toLowerCase().replace(' ', '-')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'Marks')
    XLSX.writeFile(wb, `coordinator-marks-${sectionLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Marks report downloaded')
  }

  const cell = (v: number | null) =>
    v == null ? <span className="text-slate-400">—</span> : <span className="font-semibold">{v}</span>

  return (
    <CoordinatorPageShell title="Student Marks" activeNav="marks">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        Zeroth Review · supervisor and reviewer scores per student (max {ZEROTH_REVIEW_TOTAL_MAX} each)
      </p>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Section:</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-app-surface dark:text-slate-100"
            >
              <option value="all">All Sections</option>
              {Object.entries(BATCH_COORDINATORS).map(([section, coordinator]) => (
                <option key={section} value={section}>
                  {BATCH_LABELS[section]} ({coordinator})
                </option>
              ))}
            </select>
          </div>
          <Card padding="sm" className="inline-flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.students}</span>
            <span className="text-xs text-slate-500">students</span>
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
          <Card padding="sm" className="inline-flex items-center gap-2 border-purple-100 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50">
            <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.overallAvg}</span>
            <span className="text-xs text-purple-700 dark:text-purple-300">overall avg</span>
          </Card>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search team / student / faculty"
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
                  <th className="px-3 py-3 text-center" colSpan={4}>
                    Supervisor marks
                  </th>
                  <th className="px-3 py-3 text-center" colSpan={4}>
                    Reviewer marks
                  </th>
                  <th className="px-3 py-3 text-center">Average</th>
                </tr>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="px-3 py-1" colSpan={5} />
                  <th className="px-2 py-1 text-center">Nov</th>
                  <th className="px-2 py-1 text-center">Abs</th>
                  <th className="px-2 py-1 text-center">SDG</th>
                  <th className="px-2 py-1 text-center">Tot</th>
                  <th className="px-2 py-1 text-center">Nov</th>
                  <th className="px-2 py-1 text-center">Abs</th>
                  <th className="px-2 py-1 text-center">SDG</th>
                  <th className="px-2 py-1 text-center">Tot</th>
                  <th className="px-2 py-1 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No students match.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const avg = r.totalS != null && r.totalR != null 
                      ? ((r.totalS + r.totalR) / 2).toFixed(2)
                      : null
                    return (
                      <tr key={`${r.teamCode}-${r.regNo}`} className="bg-white dark:bg-app-surface">
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-violet-700 dark:text-violet-300">
                          {r.teamCode}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{r.studentName}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{r.regNo}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{r.supervisor}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{r.reviewer}</td>
                        <td className="px-2 py-2 text-center">{cell(r.noveltyS)}</td>
                        <td className="px-2 py-2 text-center">{cell(r.abstractS)}</td>
                        <td className="px-2 py-2 text-center">{cell(r.sdgS)}</td>
                        <td className="px-2 py-2 text-center text-violet-700 dark:text-violet-300">{cell(r.totalS)}</td>
                        <td className="px-2 py-2 text-center">{cell(r.noveltyR)}</td>
                        <td className="px-2 py-2 text-center">{cell(r.abstractR)}</td>
                        <td className="px-2 py-2 text-center">{cell(r.sdgR)}</td>
                        <td className="px-2 py-2 text-center text-sky-700 dark:text-sky-300">{cell(r.totalR)}</td>
                        <td className="px-2 py-2 text-center font-bold text-purple-700 dark:text-purple-300">
                          {avg != null ? avg : <span className="text-slate-400">—</span>}
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
    </CoordinatorPageShell>
  )
}
