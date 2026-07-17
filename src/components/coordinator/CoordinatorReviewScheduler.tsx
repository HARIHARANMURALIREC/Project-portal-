import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarPlus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  REVIEW_TITLE_OPTIONS,
  deleteReviewSchedule,
  fetchCoordinatorReviewSchedules,
  fetchScheduleTeamStatus,
  formatReviewDateTime,
  rescheduleReviewForAllTeams,
  scheduleReviewForAllTeams,
  toDatetimeLocalValue,
  type ScheduleTeamStatus,
} from '@/lib/reviews'
import type { ReviewScheduleSummary } from '@/types/database'
import { ZerothReviewMarksPanel, useStudentReviewMarksMap } from '@/components/reviews/ZerothReviewMarks'
import { isZerothReview, ZEROTH_REVIEW_TOTAL_MAX } from '@/lib/reviewMarks'

function SupervisorBreakdown({
  scheduleGroupId,
  reviewTitle,
}: {
  scheduleGroupId: string
  reviewTitle: string
}) {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['schedule-team-status', scheduleGroupId],
    queryFn: () => fetchScheduleTeamStatus(scheduleGroupId),
  })

  const reviewIds = useMemo(() => teams.map((t) => t.id), [teams])
  const showMarks = isZerothReview(reviewTitle)
  const { data: marksRows = [] } = useStudentReviewMarksMap(reviewIds, showMarks && !isLoading)

  const marksByReview = useMemo(() => {
    const map = new Map<string, typeof marksRows>()
    for (const row of marksRows) {
      const list = map.get(row.team_review_id) ?? []
      list.push(row)
      map.set(row.team_review_id, list)
    }
    return map
  }, [marksRows])

  const bySupervisor = useMemo(() => {
    const map = new Map<string, ScheduleTeamStatus[]>()
    for (const team of teams) {
      const key = team.supervisor_name?.trim() || 'Unassigned'
      const list = map.get(key) ?? []
      list.push(team)
      map.set(key, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [teams])

  if (isLoading) {
    return <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading supervisor status…</p>
  }

  if (bySupervisor.length === 0) {
    return <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No team rows found for this schedule.</p>
  }

  return (
    <div className="mt-4 space-y-3">
      {bySupervisor.map(([supervisor, supervisorTeams]) => {
        const completed = supervisorTeams.filter((t) => t.completed_at).length
        const markedTeams = showMarks
          ? supervisorTeams.filter((t) => (marksByReview.get(t.id)?.length ?? 0) > 0).length
          : 0
        return (
          <div
            key={supervisor}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Supervisor: {supervisor}
              </p>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {completed}/{supervisorTeams.length} completed
                {showMarks ? ` · ${markedTeams}/${supervisorTeams.length} with marks` : ''}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {supervisorTeams.map((team) => {
                const marks = marksByReview.get(team.id) ?? []
                const supAvg =
                  marks.filter((m) => m.role === 'supervisor').length > 0
                    ? (
                        marks
                          .filter((m) => m.role === 'supervisor')
                          .reduce((s, m) => s + Number(m.total), 0) /
                        marks.filter((m) => m.role === 'supervisor').length
                      ).toFixed(1)
                    : null
                const revAvg =
                  marks.filter((m) => m.role === 'reviewer').length > 0
                    ? (
                        marks
                          .filter((m) => m.role === 'reviewer')
                          .reduce((s, m) => s + Number(m.total), 0) /
                        marks.filter((m) => m.role === 'reviewer').length
                      ).toFixed(1)
                    : null
                return (
                  <span
                    key={team.id}
                    className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ring-1 ${
                      team.completed_at
                        ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800'
                        : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800'
                    }`}
                    title={
                      supAvg || revAvg
                        ? `${team.batch_code}: supervisor avg ${supAvg ?? '—'} / reviewer avg ${revAvg ?? '—'} (max ${ZEROTH_REVIEW_TOTAL_MAX})`
                        : team.completed_at
                          ? 'Completed'
                          : 'Pending'
                    }
                  >
                    {team.batch_code}
                    {supAvg || revAvg ? ` (S${supAvg ?? '—'}·R${revAvg ?? '—'})` : ''}
                  </span>
                )
              })}
            </div>
            {showMarks && (
              <div className="mt-3 space-y-3">
                {supervisorTeams.map((team) => (
                  <div key={`marks-${team.id}`}>
                    <p className="mb-1 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {team.batch_code}
                      {team.reviewer_name ? ` · Reviewer: ${team.reviewer_name}` : ''}
                    </p>
                    <ZerothReviewMarksPanel
                      teamId={team.team_id}
                      review={{
                        id: team.id,
                        team_id: team.team_id,
                        review_title: reviewTitle,
                        scheduled_at: '',
                        completed_at: team.completed_at,
                        completed_by: null,
                        remarks: null,
                        reviewer_remarks: null,
                        reviewer_remarks_date: null,
                        created_by: '',
                        created_at: '',
                        updated_at: '',
                      }}
                      members={team.team_members}
                      markerRole="supervisor"
                      canEdit={false}
                      showBothRoles
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function CoordinatorReviewScheduler() {
  const queryClient = useQueryClient()
  const [reviewTitle, setReviewTitle] = useState<string>(REVIEW_TITLE_OPTIONS[0])
  const [customTitle, setCustomTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [remarks, setRemarks] = useState('')
  const [editing, setEditing] = useState<ReviewScheduleSummary | null>(null)
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editRemarks, setEditRemarks] = useState('')
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['coordinator-review-schedules'],
    queryFn: fetchCoordinatorReviewSchedules,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['coordinator-review-schedules'] })
    void queryClient.invalidateQueries({ queryKey: ['team-reviews'] })
    void queryClient.invalidateQueries({ queryKey: ['teacher-teams'] })
    void queryClient.invalidateQueries({ queryKey: ['schedule-team-status'] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const title = reviewTitle === 'Other' ? customTitle.trim() : reviewTitle
      if (!title) throw new Error('Enter a review name')
      if (!scheduledAt) throw new Error('Select date and time')
      return scheduleReviewForAllTeams({
        reviewTitle: title,
        scheduledAt,
        remarks,
      })
    },
    onSuccess: (result) => {
      toast.success(`Review scheduled for all ${result.teams_scheduled} teams`)
      setScheduledAt('')
      setRemarks('')
      setCustomTitle('')
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule review')
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('No schedule selected')
      if (!editScheduledAt) throw new Error('Select date and time')
      return rescheduleReviewForAllTeams({
        scheduleGroupId: editing.schedule_group_id,
        scheduledAt: editScheduledAt,
        remarks: editRemarks,
      })
    },
    onSuccess: (count) => {
      toast.success(`Updated schedule for ${count} teams`)
      setEditing(null)
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update schedule')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (scheduleGroupId: string) => deleteReviewSchedule(scheduleGroupId),
    onSuccess: (count) => {
      toast.success(`Removed review from ${count} teams`)
      if (editing) setEditing(null)
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete schedule')
    },
  })

  const startEdit = (schedule: ReviewScheduleSummary) => {
    setEditing(schedule)
    setEditScheduledAt(toDatetimeLocalValue(schedule.scheduled_at))
    setEditRemarks(schedule.remarks ?? '')
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-violet-100 dark:border-violet-800">
        <div className="mb-4 flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Schedule Common Review
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Date and time apply to every class and team. Supervisors are shown below and mark completion for their teams.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Review</label>
            <select
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-app-surface dark:text-slate-100"
            >
              {REVIEW_TITLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>
          {reviewTitle === 'Other' && (
            <Input
              label="Review name"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Model Review"
            />
          )}
          <Input
            label="Date & time (common for all teams)"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <Input
            label="Notes (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Venue, documents to bring, etc."
          />
        </div>
        <Button
          className="mt-4"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Scheduling…' : 'Schedule for all teams'}
        </Button>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Common Review Schedule</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Shared across all batches and teams. Expand a review to see each supervisor and their teams.
          </p>
        </div>

        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={4} />
          </div>
        ) : schedules.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No common reviews scheduled yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {schedules.map((schedule) => {
              const expanded = expandedGroupId === schedule.schedule_group_id
              return (
                <li key={schedule.schedule_group_id} className="px-5 py-4">
                  {editing?.schedule_group_id === schedule.schedule_group_id ? (
                    <div className="space-y-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{schedule.review_title}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          label="New date & time"
                          type="datetime-local"
                          value={editScheduledAt}
                          onChange={(e) => setEditScheduledAt(e.target.value)}
                        />
                        <Input
                          label="Notes"
                          value={editRemarks}
                          onChange={(e) => setEditRemarks(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => rescheduleMutation.mutate()}
                          disabled={rescheduleMutation.isPending}
                        >
                          {rescheduleMutation.isPending ? 'Saving…' : 'Save for all teams'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedGroupId(expanded ? null : schedule.schedule_group_id)
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {schedule.review_title}
                            </p>
                            {expanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {formatReviewDateTime(schedule.scheduled_at)}
                          </p>
                          {schedule.remarks && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Notes: {schedule.remarks}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {schedule.completed_count}/{schedule.teams_count} teams completed · click to view by supervisor
                          </p>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(schedule)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (confirm(`Remove "${schedule.review_title}" from all teams?`)) {
                                deleteMutation.mutate(schedule.schedule_group_id)
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      {expanded && (
                        <SupervisorBreakdown
                          scheduleGroupId={schedule.schedule_group_id}
                          reviewTitle={schedule.review_title}
                        />
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
