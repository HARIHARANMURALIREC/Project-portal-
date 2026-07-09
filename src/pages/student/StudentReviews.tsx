import { CalendarCheck } from 'lucide-react'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { ReviewList } from '@/components/reviews/ReviewList'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTeamReviews } from '@/hooks/useTeamReviews'
import type { StudentContext } from '@/types/student'

function StudentReviewsContent({ context }: { context: StudentContext }) {
  const { data: reviews = [], isLoading } = useTeamReviews(context.team.id)

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-violet-100 dark:border-violet-800 ring-1 ring-violet-50 dark:ring-violet-900">
        <div className="mb-4 flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project Reviews</h3>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Your supervisor schedules reviews here. Check the date, time, and review type below.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <ReviewList reviews={reviews} />
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
