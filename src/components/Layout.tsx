import { AppLogo } from '@/components/AppLogo'
import { Button } from '@/components/ui/Button'
import { branding } from '@/config/branding'

interface LayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  onSignOut?: () => void
  userName?: string
  role?: string
}

function UserAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 ring-1 ring-violet-200">
      {initial}
    </div>
  )
}

export function Layout({ title, subtitle, children, onSignOut, userName, role }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <AppLogo size="sm" showCollegeName={false} showPortalTitle={false} />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
              <p className="truncate text-xs text-slate-500">{branding.portalTitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {userName && (
              <div className="hidden items-center gap-3 sm:flex">
                <UserAvatar name={userName} />
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{userName}</p>
                  {role && (
                    <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium capitalize text-violet-700 ring-1 ring-violet-100">
                      {role}
                    </span>
                  )}
                </div>
              </div>
            )}
            {onSignOut && (
              <Button variant="secondary" size="sm" onClick={onSignOut}>
                Sign out
              </Button>
            )}
          </div>
        </div>
        {subtitle && (
          <div className="border-t border-violet-100 bg-violet-50/50 px-4 py-2 sm:px-6 lg:px-8">
            <p className="text-sm text-violet-800">{subtitle}</p>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
