import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { fetchPortalOpen } from '@/lib/portal'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { teacherHomePath } from '@/lib/teacherRoutes'
import { PortalClosedPage } from '@/pages/PortalClosedPage'
import type { UserRole } from '@/types/database'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const isStudentRoute = allowedRoles?.includes('student') ?? false

  const { data: portalOpen, isLoading: portalLoading } = useQuery({
    queryKey: ['portal-status'],
    queryFn: fetchPortalOpen,
    enabled: isStudentRoute && profile?.role === 'student',
    refetchInterval: POLL_INTERVALS.portalStatus,
    refetchOnWindowFocus: true,
  })

  if (loading || (isStudentRoute && profile?.role === 'student' && portalLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-app-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const redirect =
      profile.role === 'admin' ? '/admin' : profile.role === 'teacher' ? teacherHomePath(profile) : '/student'
    return <Navigate to={redirect} replace />
  }

  if (isStudentRoute && profile.role === 'student' && portalOpen === false) {
    return <PortalClosedPage />
  }

  return <>{children}</>
}
