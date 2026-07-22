import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ReviewFileDownloads } from '@/components/reviews/ReviewSubmissionPanel'
import { ZerothReviewMarksPanel } from '@/components/reviews/ZerothReviewMarks'
import { TeamProjectTopic } from '@/components/teacher/TeamProjectTopic'
import { fetchTeamReviews, formatReviewDateTime, isReviewCompleted } from '@/lib/reviews'
import { fetchReviewFilesForTeam } from '@/lib/reviewFiles'
import { isZerothReview } from '@/lib/reviewMarks'
import type { TeamWithDetails } from '@/types/database'

export function BatchReviewSubmissions({ teams }: { teams: TeamWithDetails[] }) {
  const [expanded, setExpanded] = useState(false)

  const reviewQueries = useQueries({
    queries: teams.map((team) => ({
      queryKey: ['team-reviews', team.id],
      queryFn: () => fetchTeamReviews(team.id),
      enabled: expanded,
    })),
  })

  const fileQueries = useQueries({
    queries: teams.map((team) => ({
      queryKey: ['team-review-files', team.id],
      queryFn: () => fetchReviewFilesForTeam(team.id),
      enabled: expanded,
    })),
  })

  const rows = useMemo(() => {
    return teams
      .map((team, index) => {
        const reviews = reviewQueries[index]?.data ?? []
        const files = fileQueries[index]?.data ?? []
        const withFiles = reviews.filter((r) => files.some((f) => f.team_review_id === r.id))
        return { team, reviews, files, withFiles }
      })
      .filter((row) => row.reviews.length > 0)
  }, [teams, reviewQueries, fileQueries])

  const loading = expanded && (reviewQueries.some((q) => q.isLoading) || fileQueries.some((q) => q.isLoading))

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Review Submissions</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            PDF/PPT uploads and Zeroth Review marks (supervisor + reviewer, per student) for teams in this
            section. Students cannot see marks.
          </p>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading submissions…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No scheduled reviews for this section yet.</p>
          ) : (
            <ul className="space-y-4">
              {rows.map(({ team, reviews, withFiles }) => (
                <li
                  key={team.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-violet-50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800">
                      {team.batch_code}
                    </span>
                    {team.supervisor_name && (
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        Supervisor: {team.supervisor_name}
                      </span>
                    )}
                    {team.reviewer_name && (
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        Reviewer: {team.reviewer_name}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {withFiles.length}/{reviews.length} review(s) have files
                    </span>
                  </div>
                  <TeamProjectTopic team={team} className="mb-3" />
                  <ul className="space-y-3">
                    {reviews.map((review) => (
                      <li key={review.id} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-app-surface">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {review.review_title}
                          <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                            {formatReviewDateTime(review.scheduled_at)}
                            {isReviewCompleted(review) ? ' · Completed' : ''}
                          </span>
                        </p>
                        <ReviewFileDownloads teamId={team.id} reviewId={review.id} />
                        {isZerothReview(review.review_title) && (
                          <ZerothReviewMarksPanel
                            teamId={team.id}
                            review={review}
                            members={team.team_members ?? []}
                            markerRole="supervisor"
                            canEdit={false}
                            showBothRoles
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
