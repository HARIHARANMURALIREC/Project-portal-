import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { ReviewUploadsPanel } from '@/components/reviews/ReviewUploadsPanel'

export function AdminUploads() {
  return (
    <AdminPageShell title="Review Uploads" activeNav="uploads">
      <ReviewUploadsPanel exportPrefix="admin-uploads" />
    </AdminPageShell>
  )
}
