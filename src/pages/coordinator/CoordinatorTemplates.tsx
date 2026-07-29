import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { TemplatesPanel } from '@/components/shared/TemplatesPanel'

export function CoordinatorTemplates() {
  return (
    <CoordinatorPageShell title="Templates" activeNav="templates">
      <TemplatesPanel />
    </CoordinatorPageShell>
  )
}
