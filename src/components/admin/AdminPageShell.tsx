import { Navigate } from 'react-router-dom'
import { AdminDashboardLayout, type AdminNavKey } from '@/components/layout/AdminDashboardLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'

export function AdminPageShell({
  title,
  activeNav,
  children,
}: {
  title: string
  activeNav: AdminNavKey
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

  if (profile?.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <AdminDashboardLayout
      title={title}
      activeNav={activeNav}
      userName={profile.full_name ?? undefined}
      onSignOut={signOut}
    >
      {children}
    </AdminDashboardLayout>
  )
}
