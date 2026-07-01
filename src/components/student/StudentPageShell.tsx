import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useStudentContext } from '@/hooks/useStudentContext'
import { canSelectProject } from '@/lib/studentRules'
import type { StudentNavKey } from '@/types/student'

interface StudentPageShellProps {
  title: string
  activeNav: StudentNavKey
  children: (ctx: NonNullable<ReturnType<typeof useStudentContext>['data']>) => React.ReactNode
}

export function StudentPageShell({ title, activeNav, children }: StudentPageShellProps) {
  const { profile, signOut } = useAuth()
  const { data: context, isLoading } = useStudentContext()

  const layoutProps = {
    title,
    activeNav,
    userName: profile?.full_name ?? undefined,
    onSignOut: signOut,
    showTopicsNav: context ? canSelectProject(context.team, context.selectionBlocked) : true,
  }

  if (isLoading) {
    return (
      <DashboardLayout {...layoutProps}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (!context) {
    return (
      <DashboardLayout {...layoutProps}>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-900">Account not linked to a team</p>
          <p className="mt-1 text-sm text-amber-800">Contact your administrator to link your account.</p>
        </div>
      </DashboardLayout>
    )
  }

  return <DashboardLayout {...layoutProps}>{children(context)}</DashboardLayout>
}
