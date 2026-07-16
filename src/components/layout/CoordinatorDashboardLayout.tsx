import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileStack,
  ClipboardList,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { AppLogo } from '@/components/AppLogo'
import { branding } from '@/config/branding'
import { TeamOgFooter } from '@/components/TeamOgFooter'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'

export type CoordinatorNavKey = 'overview' | 'uploads' | 'marks'

interface CoordinatorDashboardLayoutProps {
  title: string
  activeNav: CoordinatorNavKey
  userName?: string
  onSignOut: () => void
  children: React.ReactNode
}

const navItems: {
  key: CoordinatorNavKey
  label: string
  to: string
  icon: typeof LayoutDashboard
}[] = [
  { key: 'overview', label: 'Dashboard', to: '/coordinator', icon: LayoutDashboard },
  { key: 'uploads', label: 'Uploads', to: '/coordinator/uploads', icon: FileStack },
  { key: 'marks', label: 'Marks', to: '/coordinator/marks', icon: ClipboardList },
]

function UserAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'C'
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-800">
      {initial}
    </div>
  )
}

function navLinkClass(active: boolean, collapsed: boolean) {
  return `flex items-center rounded-lg py-2.5 text-sm font-medium transition ${
    collapsed ? 'justify-center px-2' : 'gap-3 px-3'
  } ${
    active
      ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-900 dark:hover:text-slate-100'
  }`
}

interface SidebarContentProps {
  activeNav: CoordinatorNavKey
  userName?: string
  onSignOut: () => void
  onNavigate?: () => void
  showCloseButton?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function SidebarContent({
  activeNav,
  userName,
  onSignOut,
  onNavigate,
  showCloseButton,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarContentProps) {
  return (
    <>
      <div
        className={`flex items-center border-b border-slate-200 py-4 dark:border-slate-700 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <div className={`flex min-w-0 items-center ${collapsed ? '' : 'gap-2.5'}`}>
          <AppLogo size="sm" showCollegeName={false} showPortalTitle={false} />
          {!collapsed && (
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{branding.portalTitle}</p>
          )}
        </div>
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-neutral-900 dark:hover:text-slate-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!collapsed && (
        <p className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Role: <span className="font-medium text-slate-700 dark:text-slate-300">Lead Coordinator</span>
        </p>
      )}

      <nav className={`flex-1 space-y-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map(({ key, label, to, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            end={key === 'overview'}
            title={label}
            onClick={onNavigate}
            className={({ isActive }) => navLinkClass(isActive || activeNav === key, collapsed)}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      <div className={`border-t border-slate-200 dark:border-slate-700 ${collapsed ? 'p-2' : 'p-4'}`}>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`mb-2 flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-900 dark:hover:text-slate-100 ${
              collapsed ? 'justify-center px-2' : 'gap-3 px-3'
            }`}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            {!collapsed && 'Collapse'}
          </button>
        )}
        {userName && (
          <div className={`mb-3 flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'}`} title={userName}>
            <UserAvatar name={userName} />
            {!collapsed && (
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{userName}</p>
            )}
          </div>
        )}
        <button
          type="button"
          title="Logout"
          onClick={() => {
            onNavigate?.()
            onSignOut()
          }}
          className={`flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 ${
            collapsed ? 'justify-center px-2' : 'gap-3 px-3'
          }`}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </>
  )
}

export function CoordinatorDashboardLayout({
  title,
  activeNav,
  userName,
  onSignOut,
  children,
}: CoordinatorDashboardLayoutProps) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="flex min-h-screen bg-white dark:bg-app-black">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-700 dark:bg-app-surface lg:flex ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent
          activeNav={activeNav}
          userName={userName}
          onSignOut={onSignOut}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeMobileMenu}
            aria-label="Close menu overlay"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-app-surface lg:hidden">
            <SidebarContent
              activeNav={activeNav}
              userName={userName}
              onSignOut={onSignOut}
              onNavigate={closeMobileMenu}
              showCloseButton
              onClose={closeMobileMenu}
            />
          </aside>
        </>
      )}

      <div
        className={`flex min-h-screen w-full flex-1 flex-col transition-[padding] duration-200 ${
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-app-surface/95 sm:py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-900 dark:hover:text-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-900 dark:hover:text-slate-100 lg:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <h1 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">{title}</h1>
              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle />
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-800 sm:px-3">
                  Coordinator
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden bg-white p-4 pb-4 dark:bg-app-black lg:p-6 lg:pb-6">{children}</main>

        <TeamOgFooter className="border-t border-slate-100 py-4 dark:border-slate-800 lg:py-6" />

        <nav className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-md dark:border-slate-700 dark:bg-app-surface/95 lg:hidden">
          <div className="flex items-center justify-around gap-1">
            {navItems.map(({ key, label, to, icon: Icon }) => (
              <NavLink
                key={key}
                to={to}
                end={key === 'overview'}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium sm:text-xs ${
                    isActive || activeNav === key
                      ? 'text-violet-700 dark:text-violet-300'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate text-center leading-tight">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
