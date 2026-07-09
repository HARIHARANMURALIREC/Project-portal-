import { Link } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import { ReviewList } from '@/components/reviews/ReviewList'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTeamReviews } from '@/hooks/useTeamReviews'
import { isReviewCompleted } from '@/lib/reviews'

export function TeamReviewsCard({ teamId, compact = false }: { teamId: string; compact?: boolean }) {
  const { data: reviews = [], isLoading } = useTeamReviews(teamId)
  const upcoming = reviews.filter((r) => !isReviewCompleted(r))
  const nextReview = upcoming[0]

  if (isLoading) {
    return (
      <Card padding="lg" className="border-slate-200 dark:border-slate-700">
        <div className="flex justify-center py-6">
          <LoadingSpinner />
        </div>
      </Card>
    )
  }

  if (reviews.length === 0) {
    return null
  }

  return (
    <Card padding="lg" className="border-violet-100 dark:border-violet-800 ring-1 ring-violet-50 dark:ring-violet-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project Reviews</h3>
        </div>
        {!compact && (
          <Link
            to="/student/reviews"
            className="text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
          >
            View all →
          </Link>
        )}
      </div>

      {nextReview && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Next review: <span className="font-semibold">{nextReview.review_title}</span>
        </p>
      )}

      {compact ? (
        <ReviewList reviews={reviews.slice(0, 3)} emptyMessage="No reviews scheduled yet." />
      ) : (
        <ReviewList reviews={reviews} />
      )}

      {compact && reviews.length > 3 && (
        <Link
          to="/student/reviews"
          className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
        >
          View all {reviews.length} reviews →
        </Link>
      )}
    </Card>
  )
}
