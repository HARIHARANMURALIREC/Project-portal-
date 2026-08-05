import { CheckCircle2, Clock } from 'lucide-react'
import { formatReviewDateTime, formatReviewSchedule, isReviewCompleted } from '@/lib/reviews'
import type { TeamReview } from '@/types/database'

export function ReviewStatusBadge({ review }: { review: TeamReview }) {
  const done = isReviewCompleted(review)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        done
          ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800'
          : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800'
      }`}
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {done ? 'Completed' : 'Pending'}
    </span>
  )
}

interface ReviewListProps {
  reviews: TeamReview[]
  emptyMessage?: string
}

export function ReviewList({ reviews, emptyMessage = 'No reviews scheduled yet.' }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80"
        >
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{review.review_title}</p>
            {isReviewCompleted(review) && review.completed_at ? (
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                Completed: {formatReviewDateTime(review.completed_at)}
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Review date: {formatReviewSchedule(review.scheduled_at, review.scheduled_end_at)}
                </p>
                {(review.announced_at || review.created_at) && (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Announcement date:{' '}
                    {formatReviewDateTime(review.announced_at ?? review.created_at)}
                  </p>
                )}
              </>
            )}
            {review.remarks && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Notes:</span> {review.remarks}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
