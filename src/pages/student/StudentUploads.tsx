import { StudentPageShell } from '@/components/student/StudentPageShell'
import { TemplatesPanel } from '@/components/shared/TemplatesPanel'

export function StudentUploads() {
  return (
    <StudentPageShell title="Uploads" activeNav="uploads">
      {() => <TemplatesPanel />}
    </StudentPageShell>
  )
}
