import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TeacherPageShell } from '@/components/teacher/TeacherPageShell'
import { TeamProjectTopic } from '@/components/teacher/TeamProjectTopic'
import { ReviewStatusBadge } from '@/components/reviews/ReviewList'
import { ReviewFileDownloads } from '@/components/reviews/ReviewSubmissionPanel'
import { ZerothReviewMarksPanel } from '@/components/reviews/ZerothReviewMarks'
import { ProgressiveReviewMarksPanel } from '@/components/reviews/ProgressiveReviewMarks'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useTeacherTeams } from '@/hooks/useTeacherTeams'
import { useTeamReviews } from '@/hooks/useTeamReviews'
import { sortTeamMembers } from '@/lib/teamSort'
import {
  completeTeamReview,
  formatReviewDateTime,
  formatReviewSchedule,
  isReviewCompleted,
  reopenTeamReview,
} from '@/lib/reviews'
import {
  REVIEW_SLOT_OPTIONS,
  isProgressiveReviewSlot,
  isZerothReview,
  matchReviewSlot,
  type ReviewSlot,
} from '@/lib/reviewMarks'
import type { TeamReview, TeamWithDetails } from '@/types/database'

function TeamReviewPanel({
  team,
  reviewSlot,
}: {
  team: TeamWithDetails
  reviewSlot: ReviewSlot
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: reviews = [], isLoading: reviewsLoading } = useTeamReviews(team.id)
  const [expanded, setExpanded] = useState(false)

  const sortedReviews = reviews
    .slice()
    .filter((r) => matchReviewSlot(r.review_title, reviewSlot))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['teacher-teams'] })
    void queryClient.invalidateQueries({ queryKey: ['team-reviews', team.id] })
    void queryClient.invalidateQueries({ queryKey: ['coordinator-review-schedules'] })
  }

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
  const slotLabel = REVIEW_SLOT_OPTIONS.find((o) => o.value === reviewSlot)?.label ?? reviewSlot

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
                {team.supervisor_name}
              </span>
            )}
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {sortedReviews.length} {slotLabel.toLowerCase()}(s)
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {pendingCount} upcoming
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{memberList}</p>
          <TeamProjectTopic team={team} className="mt-2" />
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
        )}
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
                        Review date: {formatReviewSchedule(review.scheduled_at, review.scheduled_end_at)}
                      </p>
                      {(review.announced_at || review.created_at) && (
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                          Announcement date:{' '}
                          {formatReviewDateTime(review.announced_at ?? review.created_at)}
                        </p>
                      )}
                      {isReviewCompleted(review) && review.completed_at && (
                        <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300">
                          Completed: {formatReviewDateTime(review.completed_at)}
                        </p>
                      )}
                      {review.remarks && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Notes: {review.remarks}</p>
                      )}
                      {review.reviewer_remarks && (
                        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-800 dark:bg-sky-950/40">
                          <p className="text-sm font-semibold text-sky-900 dark:text-sky-200">Reviewer Remarks</p>
                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{review.reviewer_remarks}</p>
                          {review.reviewer_remarks_date && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Date: {formatReviewDateTime(review.reviewer_remarks_date)}
                            </p>
                          )}
                        </div>
                      )}
                      <ReviewFileDownloads teamId={team.id} reviewId={review.id} />
                      {team.reviewer_name && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          Reviewer: <span className="font-medium">{team.reviewer_name}</span>
                        </p>
                      )}
                      {reviewSlot === '0th' || isZerothReview(review.review_title) ? (
                        <ZerothReviewMarksPanel
                          teamId={team.id}
                          review={review}
                          members={team.team_members ?? []}
                          markerRole="supervisor"
                          canEdit
                        />
                      ) : isProgressiveReviewSlot(reviewSlot) ? (
                        <ProgressiveReviewMarksPanel
                          teamId={team.id}
                          review={review}
                          members={team.team_members ?? []}
                          markerRole="supervisor"
                          canEdit
                          reviewSlot={reviewSlot}
                        />
                      ) : null}
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No {slotLabel.toLowerCase()} scheduled yet for this team. The coordinator will set the review
              date and time.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

function TeacherReviewsContent() {
  const { data: teams = [], isLoading } = useTeacherTeams()
  const [reviewSlot, setReviewSlot] = useState<ReviewSlot>('0th')

  return (
    <div className="space-y-4">
      <Card padding="lg" className="border-violet-100 dark:border-violet-800">
        <label
          htmlFor="supervisor-review-slot"
          className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          Select review
        </label>
        <select
          id="supervisor-review-slot"
          value={reviewSlot}
          onChange={(e) => setReviewSlot(e.target.value as ReviewSlot)}
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-app-surface dark:text-slate-100"
        >
          {REVIEW_SLOT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {reviewSlot === '0th'
            ? '0th Review uses Novelty, Abstract, and SDG marks (supervisor column).'
            : reviewSlot === '2nd'
              ? '2nd Review (Review II): Problem statement & Architecture, Proposed Methodology, Modules Design & Description, Modules Demo, Journal/Conference paper readiness (max 10 each).'
              : '1st / 3rd Review use Feasibility, Proposed Methodology, Background, Literature Survey, and Reference Paper (max 10 each).'}
        </p>
      </Card>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Review date and time are set by the coordinator for all teams. Enter supervisor marks for the selected
        review. Reviewers enter marks separately on the Reviewer page. Coordinators see supervisor, internal,
        and external marks; students see none. Mark a review as completed when your team has finished it.
      </p>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : teams.length === 0 ? (
        <Card padding="lg" className="text-center text-sm text-slate-500 dark:text-slate-400">
          No teams assigned to you yet.
        </Card>
      ) : (
        teams.map((team) => <TeamReviewPanel key={team.id} team={team} reviewSlot={reviewSlot} />)
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
