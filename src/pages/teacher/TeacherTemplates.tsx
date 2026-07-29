import { TeacherPageShell } from '@/components/teacher/TeacherPageShell'
import { TeacherTemplatesPanel } from '@/components/shared/TeacherTemplatesPanel'

export function TeacherTemplates() {
  return (
    <TeacherPageShell title="Templates" activeNav="templates">
      <TeacherTemplatesPanel />
    </TeacherPageShell>
  )
}
