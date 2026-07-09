import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarPlus, ChevronDown, ChevronUp } from 'lucide-react'
import { TeacherPageShell } from '@/components/teacher/TeacherPageShell'
import { ReviewStatusBadge } from '@/components/reviews/ReviewList'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { useTeacherTeams } from '@/hooks/useTeacherTeams'
import { useTeamReviews } from '@/hooks/useTeamReviews'
import { sortTeamMembers } from '@/lib/teamSort'
import {
  REVIEW_TITLE_OPTIONS,
  completeTeamReview,
  createTeamReview,
  formatReviewDateTime,
  isReviewCompleted,
  reopenTeamReview,
} from '@/lib/reviews'
import type { TeamReview, TeamWithDetails } from '@/types/database'

function TeamReviewPanel({ team }: { team: TeamWithDetails }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: reviews = [], isLoading: reviewsLoading } = useTeamReviews(team.id)
  const [expanded, setExpanded] = useState(false)
  const [reviewTitle, setReviewTitle] = useState<string>(REVIEW_TITLE_OPTIONS[0])
  const [customTitle, setCustomTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [remarks, setRemarks] = useState('')

  const sortedReviews = reviews.slice().sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  )

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['teacher-teams'] })
    void queryClient.invalidateQueries({ queryKey: ['team-reviews', team.id] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const title = reviewTitle === 'Other' ? customTitle.trim() : reviewTitle
      if (!title) throw new Error('Enter a review name')
      if (!scheduledAt) throw new Error('Select date and time')
      if (!user?.id) throw new Error('Not signed in')

      return createTeamReview({
        teamId: team.id,
        reviewTitle: title,
        scheduledAt,
        remarks,
        createdBy: user.id,
      })
    },
    onSuccess: () => {
      toast.success(`Review scheduled for ${team.batch_code}`)
      setScheduledAt('')
      setRemarks('')
      setCustomTitle('')
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule review')
    },
  })

  const completeMutation = useMutation({
    mutationFn: async (review: TeamReview) => {
      if (!user?.id) throw new Error('Not signed in')
      return completeTeamReview(review.id, user.id)
    },
    onSuccess: () => {
      toast.success('Review marked as completed')
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to complete review')
    },
  })

  const reopenMutation = useMutation({
    mutationFn: (reviewId: string) => reopenTeamReview(reviewId),
    onSuccess: () => {
      toast.success('Review reopened')
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to reopen review')
    },
  })

  const memberList = team.team_members?.length
    ? sortTeamMembers(team.team_members).map((m) => m.name).join(', ')
    : '—'
  const pendingCount = sortedReviews.filter((r) => !isReviewCompleted(r)).length

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
            <span className="text-sm text-slate-600 dark:text-slate-300">{sortedReviews.length} review(s)</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {pendingCount} upcoming
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
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Loading reviews…</p>
          ) : sortedReviews.length > 0 ? (
            <ul className="mb-6 space-y-3">
              {sortedReviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{review.review_title}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Scheduled: {formatReviewDateTime(review.scheduled_at)}
                      </p>
                      {isReviewCompleted(review) && review.completed_at && (
                        <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300">
                          Completed: {formatReviewDateTime(review.completed_at)}
                        </p>
                      )}
                      {review.remarks && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Notes: {review.remarks}</p>
                      )}
                    </div>
                    <ReviewStatusBadge review={review} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!isReviewCompleted(review) ? (
                      <Button
                        size="sm"
                        onClick={() => completeMutation.mutate(review)}
                        disabled={completeMutation.isPending}
                      >
                        Mark completed
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => reopenMutation.mutate(review.id)}
                        disabled={reopenMutation.isPending}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">No reviews scheduled for this team yet.</p>
          )}

          <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-200">
              <CalendarPlus className="h-4 w-4" />
              Schedule a review
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
                label="Date & time"
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
              {createMutation.isPending ? 'Saving…' : 'Schedule review'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function TeacherReviewsContent() {
  const { data: teams = [], isLoading } = useTeacherTeams()
  const visibleTeams = teams

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Assign review date, time, and review type for each team. Students will see scheduled reviews on their dashboard.
        Mark a review as completed when the team has finished it.
      </p>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : visibleTeams.length === 0 ? (
        <Card padding="lg" className="text-center text-sm text-slate-500 dark:text-slate-400">
          No teams assigned to you yet.
        </Card>
      ) : (
        visibleTeams.map((team) => <TeamReviewPanel key={team.id} team={team} />)
      )}
    </div>
  )
}

export function TeacherReviews() {
  return (
    <TeacherPageShell title="Reviews" activeNav="reviews">
      <TeacherReviewsContent />
    </TeacherPageShell>
  )
}
