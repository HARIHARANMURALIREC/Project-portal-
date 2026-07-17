import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { ReviewMarksPanel } from '@/components/reviews/ReviewMarksPanel'

export function AdminMarks() {
  return (
    <AdminPageShell title="Student Marks" activeNav="marks">
      <ReviewMarksPanel exportPrefix="admin-marks" />
    </AdminPageShell>
  )
}
