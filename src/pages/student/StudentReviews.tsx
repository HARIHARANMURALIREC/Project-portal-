import { CalendarCheck } from 'lucide-react'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { ReviewStatusBadge } from '@/components/reviews/ReviewList'
import { ReviewSubmissionPanel } from '@/components/reviews/ReviewSubmissionPanel'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTeamReviews } from '@/hooks/useTeamReviews'
import { formatReviewDateTime, isReviewCompleted } from '@/lib/reviews'
import type { StudentContext } from '@/types/student'

function StudentReviewsContent({ context }: { context: StudentContext }) {
  const { data: reviews = [], isLoading } = useTeamReviews(context.team.id)
  const sorted = reviews.slice().sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  )

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-violet-100 dark:border-violet-800 ring-1 ring-violet-50 dark:ring-violet-900">
        <div className="mb-4 flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project Reviews</h3>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          The coordinator sets a common review date and time for all teams. Upload one PDF and one PPT per review.
          Filename must include team ID, review name, and date (example:{' '}
          <span className="font-mono text-xs">{context.team.batch_code}_ZerothReview_2026-07-15.pdf</span>).
          Rubric marks are entered by your supervisor and are not shown to students.
        </p>
        {context.team.supervisor_name && (
          <p className="mb-4 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
            Project supervisor: <span className="font-semibold">{context.team.supervisor_name}</span>
          </p>
        )}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No reviews scheduled yet.</p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((review) => (
              <li
                key={review.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
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
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-medium">Notes:</span> {review.remarks}
                      </p>
                    )}
                  </div>
                  <ReviewStatusBadge review={review} />
                </div>
                <ReviewSubmissionPanel
                  teamId={context.team.id}
                  batchCode={context.team.batch_code}
                  review={review}
                  canUpload
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function StudentReviews() {
  return (
    <StudentPageShell title="Reviews" activeNav="reviews">
      {(context) => <StudentReviewsContent context={context} />}
    </StudentPageShell>
  )
}
