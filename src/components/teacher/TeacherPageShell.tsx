import { Navigate } from 'react-router-dom'
import { TeacherDashboardLayout } from '@/components/layout/TeacherDashboardLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { getBatchIdForCoordinator } from '@/lib/batchCoordinators'
import { isCoordinatorPortalUser, isBatchCoordinatorSupervisor } from '@/lib/teacherRoutes'
import type { TeacherNavKey } from '@/types/teacher'

interface TeacherPageShellProps {
  title: string
  activeNav: TeacherNavKey
  children: React.ReactNode
}

export function TeacherPageShell({ title, activeNav, children }: TeacherPageShellProps) {
  const { profile, signOut, loading } = useAuth()
  const batchId = getBatchIdForCoordinator(profile)
  const isDualRole = isBatchCoordinatorSupervisor(profile)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-app-black">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Pure coordinators (no supervisor_name) cannot access /teacher — redirect to /coordinator.
  // Batch coordinators who are also supervisors (isBatchCoordinatorSupervisor) are allowed through.
  if (isCoordinatorPortalUser(profile) && !isDualRole) {
    return <Navigate to="/coordinator" replace />
  }

  if (!profile?.supervisor_name) {
    return (
      <TeacherDashboardLayout
        title={title}
        activeNav={activeNav}
        userName={profile?.full_name ?? undefined}
        batchId={batchId}
        onSignOut={signOut}
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-200">Supervisor profile not configured</p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Contact the administrator to link your supervisor account.</p>
        </div>
      </TeacherDashboardLayout>
    )
  }

  return (
    <TeacherDashboardLayout
      title={title}
      activeNav={activeNav}
      userName={profile.full_name ?? undefined}
      supervisorName={profile.supervisor_name}
      batchId={batchId}
      showCoordinatorSwitch={isDualRole}
      onSignOut={signOut}
    >
      {children}
    </TeacherDashboardLayout>
  )
}
