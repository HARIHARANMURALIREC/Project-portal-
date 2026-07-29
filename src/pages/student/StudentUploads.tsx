import { StudentPageShell } from '@/components/student/StudentPageShell'
import { StudentTemplatesPanel } from '@/components/shared/StudentTemplatesPanel'

export function StudentUploads() {
  return (
    <StudentPageShell title="Uploads" activeNav="uploads">
      {() => <StudentTemplatesPanel />}
    </StudentPageShell>
  )
}
