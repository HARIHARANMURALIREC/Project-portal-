import { Navigate } from 'react-router-dom'
import {
  CoordinatorDashboardLayout,
  type CoordinatorNavKey,
} from '@/components/layout/CoordinatorDashboardLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { coordinatorRoleLabel, isCoordinatorPortalUser } from '@/lib/teacherRoutes'

export function CoordinatorPageShell({
  title,
  activeNav,
  children,
}: {
  title: string
  activeNav: CoordinatorNavKey
  children: React.ReactNode
}) {
  const { profile, signOut, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-app-black">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isCoordinatorPortalUser(profile)) {
    return <Navigate to="/teacher" replace />
  }

  return (
    <CoordinatorDashboardLayout
      title={title}
      activeNav={activeNav}
      userName={profile?.full_name ?? undefined}
      roleLabel={coordinatorRoleLabel(profile)}
      onSignOut={signOut}
    >
      {children}
    </CoordinatorDashboardLayout>
  )
}
