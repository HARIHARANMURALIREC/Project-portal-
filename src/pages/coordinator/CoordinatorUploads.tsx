import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { ReviewUploadsPanel } from '@/components/reviews/ReviewUploadsPanel'

export function CoordinatorUploads() {
  return (
    <CoordinatorPageShell title="Review Uploads" activeNav="uploads">
      <ReviewUploadsPanel exportPrefix="coordinator-uploads" />
    </CoordinatorPageShell>
  )
}
