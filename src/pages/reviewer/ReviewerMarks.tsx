import { ReviewerPageShell } from '@/components/reviewer/ReviewerPageShell'
import { TeacherReviewerContent } from '@/pages/teacher/TeacherReviewer'

export function ReviewerMarks() {
  return (
    <ReviewerPageShell title="Marks" activeNav="reviewer">
      <TeacherReviewerContent />
    </ReviewerPageShell>
  )
}
