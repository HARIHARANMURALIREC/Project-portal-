import { TeacherPageShell } from '@/components/teacher/TeacherPageShell'
import { TemplatesPanel } from '@/components/shared/TemplatesPanel'

export function TeacherTemplates() {
  return (
    <TeacherPageShell title="Templates" activeNav="templates">
      <TemplatesPanel />
    </TeacherPageShell>
  )
}
