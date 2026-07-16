import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AppLogo } from '@/components/AppLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { branding } from '@/config/branding'

export function PortalClosedPage() {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-app-black">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md dark:bg-app-black/95">
        <div className="flex w-full items-center justify-between gap-4 py-3 pl-3 pr-4 sm:pl-4 sm:pr-6">
          <AppLogo
            size="sm"
            src={branding.loginLogoSrc}
            showCollegeName={false}
            showPortalTitle={false}
            className="[&_img]:h-12 [&_img]:max-w-[280px] sm:[&_img]:h-14 sm:[&_img]:max-w-[320px]"
          />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Card padding="lg" className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
            <svg className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V7a4 4 0 00-8 0v4m12 0a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12a2 2 0 012 2v6z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Portal Closed</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            The project allotment portal is temporarily closed. Please check back later or contact your coordinator.
          </p>
          <Button variant="secondary" className="mt-6" onClick={() => signOut()}>
            Sign out
          </Button>
        </Card>
      </main>
    </div>
  )
}
