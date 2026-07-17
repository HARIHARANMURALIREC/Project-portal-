import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Save, Pencil } from 'lucide-react'
import { TeacherPageShell } from '@/components/teacher/TeacherPageShell'
import { ReviewStatusBadge } from '@/components/reviews/ReviewList'
import { ReviewFileDownloads } from '@/components/reviews/ReviewSubmissionPanel'
import { ZerothReviewMarksPanel } from '@/components/reviews/ZerothReviewMarks'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useReviewerTeams } from '@/hooks/useReviewerTeams'
import { useTeamReviews } from '@/hooks/useTeamReviews'
import { useAuth } from '@/hooks/useAuth'
import { sortTeamMembers } from '@/lib/teamSort'
import { formatReviewDateTime, isReviewCompleted, toDatetimeLocalValue } from '@/lib/reviews'
import { isZerothReview } from '@/lib/reviewMarks'
import { supabase } from '@/lib/supabase'
import { StudentAttendancePanel } from '@/components/teacher/StudentAttendance'
import type { TeamWithDetails } from '@/types/database'

function ReviewerTeamPanel({ team }: { team: TeamWithDetails }) {
  const { data: reviews = [], isLoading: reviewsLoading } = useTeamReviews(team.id)
  const [expanded, setExpanded] = useState(false)
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null)
  const [remarksText, setRemarksText] = useState('')
  const [remarksDate, setRemarksDate] = useState('')
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const sortedReviews = reviews.slice().sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  )

  const memberList = team.team_members?.length
    ? sortTeamMembers(team.team_members).map((m) => m.name).join(', ')
    : '—'
  const zerothPending = sortedReviews.filter((r) => isZerothReview(r.review_title)).length

  const updateRemarksMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      if (!user?.id) throw new Error('Not signed in')
      const { error } = await supabase
        .from('team_reviews')
        .update({
          reviewer_remarks: remarksText.trim() || null,
          reviewer_remarks_date: remarksDate ? new Date(remarksDate).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Reviewer remarks updated')
      setEditingRemarks(null)
      setRemarksText('')
      setRemarksDate('')
      void queryClient.invalidateQueries({ queryKey: ['team-reviews', team.id] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update remarks')
    },
  })

  const startEditingRemarks = (review: typeof sortedReviews[0]) => {
    setEditingRemarks(review.id)
    setRemarksText(review.reviewer_remarks || '')
    setRemarksDate(review.reviewer_remarks_date ? toDatetimeLocalValue(review.reviewer_remarks_date) : '')
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-violet-50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800">
              {team.batch_code}
            </span>
            {team.supervisor_name && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
                Supervisor: {team.supervisor_name}
              </span>
            )}
            <span className="text-sm text-slate-600 dark:text-slate-300">{sortedReviews.length} review(s)</span>
            {zerothPending > 0 && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                Zeroth Review
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{memberList}</p>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">
          {reviewsLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading reviews…</p>
          ) : sortedReviews.length > 0 ? (
            <ul className="space-y-3">
              {sortedReviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{review.review_title}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Scheduled: {formatReviewDateTime(review.scheduled_at)}
                        {isReviewCompleted(review) && review.completed_at
                          ? ` · Completed ${formatReviewDateTime(review.completed_at)}`
                          : ''}
                      </p>
                      {review.remarks && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Notes: {review.remarks}</p>
                      )}
                      
                      {/* Reviewer Remarks Section */}
                      <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/40">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-sky-900 dark:text-sky-200">Reviewer Remarks</p>
                          {editingRemarks !== review.id && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => startEditingRemarks(review)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                        
                        {editingRemarks === review.id ? (
                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Remarks</label>
                              <textarea
                                value={remarksText}
                                onChange={(e) => setRemarksText(e.target.value)}
                                placeholder="Enter your remarks..."
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-app-surface dark:text-slate-100 dark:focus:border-primary-400"
                              />
                            </div>
                            <Input
                              label="Date"
                              type="datetime-local"
                              value={remarksDate}
                              onChange={(e) => setRemarksDate(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateRemarksMutation.mutate(review.id)}
                                disabled={updateRemarksMutation.isPending}
                              >
                                <Save className="mr-1 h-3 w-3" />
                                {updateRemarksMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingRemarks(null)
                                  setRemarksText('')
                                  setRemarksDate('')
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : review.reviewer_remarks ? (
                          <div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{review.reviewer_remarks}</p>
                            {review.reviewer_remarks_date && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Date: {formatReviewDateTime(review.reviewer_remarks_date)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400 italic">No remarks added yet</p>
                        )}
                      </div>
                      
                      <ReviewFileDownloads teamId={team.id} reviewId={review.id} />
                      <ZerothReviewMarksPanel
                        teamId={team.id}
                        review={review}
                        members={team.team_members ?? []}
                        markerRole="reviewer"
                        canEdit
                      />
                    </div>
                    <ReviewStatusBadge review={review} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No common reviews scheduled yet for this team.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

function TeacherReviewerContent() {
  const { data: teams = [], isLoading } = useReviewerTeams()

  return (
    <div className="space-y-6">
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : teams.length === 0 ? (
        <Card padding="lg" className="text-center text-sm text-slate-500 dark:text-slate-400">
          No teams assigned to you as reviewer yet.
        </Card>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Student Attendance</h2>
            <div className="space-y-4">
              {teams.map((team) => (
                <StudentAttendancePanel key={team.id} team={team} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Team Reviews</h2>
            <div className="space-y-4">
              {teams.map((team) => <ReviewerTeamPanel key={team.id} team={team} />)}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export function TeacherReviewer() {
  return (
    <TeacherPageShell title="Reviewer" activeNav="reviewer">
      <TeacherReviewerContent />
    </TeacherPageShell>
  )
}
