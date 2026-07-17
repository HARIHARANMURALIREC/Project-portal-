import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { ReviewMarksPanel } from '@/components/reviews/ReviewMarksPanel'

export function CoordinatorMarks() {
  return (
    <CoordinatorPageShell title="Student Marks" activeNav="marks">
      <ReviewMarksPanel exportPrefix="coordinator-marks" />
    </CoordinatorPageShell>
  )
}
