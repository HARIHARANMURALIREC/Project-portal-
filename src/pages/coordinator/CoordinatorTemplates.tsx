import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { CoordinatorTemplatesPanel } from '@/components/shared/CoordinatorTemplatesPanel'

export function CoordinatorTemplates() {
  return (
    <CoordinatorPageShell title="Templates" activeNav="templates">
      <CoordinatorTemplatesPanel />
    </CoordinatorPageShell>
  )
}
