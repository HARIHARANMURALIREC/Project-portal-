import { ReviewerPageShell } from '@/components/reviewer/ReviewerPageShell'
import { TeacherTemplatesPanel } from '@/components/shared/TeacherTemplatesPanel'

export function ReviewerUploads() {
  return (
    <ReviewerPageShell title="Uploads" activeNav="templates">
      <TeacherTemplatesPanel />
    </ReviewerPageShell>
  )
}
