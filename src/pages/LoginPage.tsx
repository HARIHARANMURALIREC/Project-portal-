import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  supabase,
  isSupabaseConfigured,
  supabaseConfigError,
  clearLocalAuthSession,
  resolveCoordinatorLoginEmail,
  resolveSupervisorLoginEmail,
  normalizeTeamCode,
  studentAuthCredentials,
} from '@/lib/supabase'
import { fetchPortalOpen } from '@/lib/portal'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { isCoordinatorPortalUser, teacherHomePath } from '@/lib/teacherRoutes'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { AppLogo } from '@/components/AppLogo'
import { TeamOgFooter } from '@/components/TeamOgFooter'
import { ThemeToggle } from '@/components/ThemeToggle'
import { branding } from '@/config/branding'
import type { Profile } from '@/types/database'

const studentLoginSchema = z.object({
  teamId: z
    .string()
    .min(1, 'Team ID is required')
    .regex(/^27[A-D]\d{2}$/i, 'Enter a valid team ID (e.g. 27A01)'),
  password: z.string().min(1, 'Password is required'),
})

const coordinatorLoginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const supervisorLoginSchema = z.object({
  identifier: z.string().min(1, 'Supervisor email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type StudentLoginForm = z.infer<typeof studentLoginSchema>
type CoordinatorLoginForm = z.infer<typeof coordinatorLoginSchema>
type SupervisorLoginForm = z.infer<typeof supervisorLoginSchema>

type LoginMode = 'student' | 'coordinator' | 'supervisor'

async function verifyStudentTeam(teamId: string): Promise<boolean> {
  const { data: member, error } = await supabase
    .from('team_members')
    .select('teams (batch_code)')
    .eq('user_id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  if (error || !member) return false

  const team = member.teams as { batch_code: string } | { batch_code: string }[] | null
  const batchCode = Array.isArray(team) ? team[0]?.batch_code : team?.batch_code
  if (!batchCode) return false

  return normalizeTeamCode(batchCode) === normalizeTeamCode(teamId)
}

async function fetchLoginProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as Profile
}

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, loading, signOut } = useAuth()
  const [mode, setMode] = useState<LoginMode>('student')

  const { data: portalOpen = true } = useQuery({
    queryKey: ['portal-status'],
    queryFn: fetchPortalOpen,
    enabled: isSupabaseConfigured && mode === 'student',
    refetchInterval: mode === 'student' ? POLL_INTERVALS.portalStatus : false,
    refetchOnWindowFocus: mode === 'student',
    retry: 1,
  })

  const studentPortalClosed = mode === 'student' && !portalOpen

  const studentForm = useForm<StudentLoginForm>({
    resolver: zodResolver(studentLoginSchema),
  })

  const coordinatorForm = useForm<CoordinatorLoginForm>({
    resolver: zodResolver(coordinatorLoginSchema),
  })

  const supervisorForm = useForm<SupervisorLoginForm>({
    resolver: zodResolver(supervisorLoginSchema),
  })

  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === 'admin') {
        navigate('/admin', { replace: true })
        return
      }
      if (profile.role === 'teacher') {
        navigate(teacherHomePath(profile), { replace: true })
        return
      }
      if (profile.role === 'student') {
        fetchPortalOpen().then((open) => {
          if (open) {
            navigate('/student', { replace: true })
          } else {
            void signOut()
          }
        })
      }
    }
  }, [profile, loading, navigate, signOut])

  async function onStudentSubmit(data: StudentLoginForm) {
    if (!isSupabaseConfigured) {
      toast.error(supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    const open = await fetchPortalOpen()
    if (!open) {
      toast.error('The portal is currently closed. Please try again later.')
      return
    }

    const { email, password } = studentAuthCredentials(data.password)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const isInvalidKey =
        error.status === 401 ||
        error.message.toLowerCase().includes('invalid api key')
      const hint = isInvalidKey
        ? ' Supabase API key is wrong on this deployment. In Vercel, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (anon public key only), then redeploy.'
        : error.message === 'Invalid login credentials'
          ? ' Use your Registration No. as the password (same value as Reg.No.).'
          : ''
      toast.error(error.message + hint)
      return
    }

    const teamMatches = await verifyStudentTeam(data.teamId)
    if (!teamMatches) {
      await clearLocalAuthSession()
      toast.error('Team ID does not match your account.')
      return
    }

    toast.success('Signed in successfully')
  }

  async function onCoordinatorSubmit(data: CoordinatorLoginForm) {
    if (!isSupabaseConfigured) {
      toast.error(supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    let email: string
    try {
      email = resolveCoordinatorLoginEmail(data.email)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid email')
      return
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    })

    if (error) {
      const isInvalidKey =
        error.status === 401 ||
        error.message.toLowerCase().includes('invalid api key')
      const hint = isInvalidKey
        ? ' Supabase API key is wrong on this deployment. In Vercel, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (anon public key only), then redeploy.'
        : error.message === 'Invalid login credentials'
          ? ' Check your coordinator email and password.'
          : ''
      toast.error(error.message + hint)
      return
    }

    const loginProfile = authData.user ? await fetchLoginProfile(authData.user.id) : null
    if (!isCoordinatorPortalUser(loginProfile)) {
      await clearLocalAuthSession()
      toast.error('This account is not a coordinator. Sign in on the Supervisor tab.')
      return
    }

    toast.success('Signed in successfully')
  }

  async function onSupervisorSubmit(data: SupervisorLoginForm) {
    if (!isSupabaseConfigured) {
      toast.error(supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    let email: string
    try {
      email = resolveSupervisorLoginEmail(data.identifier)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid login ID')
      return
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    })

    if (error) {
      const isInvalidKey =
        error.status === 401 ||
        error.message.toLowerCase().includes('invalid api key')
      const hint = isInvalidKey
        ? ' Supabase API key is wrong on this deployment. In Vercel, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (anon public key only), then redeploy.'
        : error.message === 'Invalid login credentials'
          ? ' Check your supervisor email and password.'
          : ''
      toast.error(error.message + hint)
      return
    }

    const loginProfile = authData.user ? await fetchLoginProfile(authData.user.id) : null
    if (isCoordinatorPortalUser(loginProfile)) {
      await clearLocalAuthSession()
      toast.error('Coordinator accounts can only sign in on the Coordinator tab.')
      return
    }

    toast.success('Signed in successfully')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-app-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    )
  }

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
        <div className="w-full max-w-sm">
          <Card padding="lg" className="border-slate-200 dark:border-slate-700 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{branding.portalTitle}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to continue</p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-3 py-2 text-left text-xs text-amber-900 dark:text-amber-200">
                {supabaseConfigError}
              </div>
            )}

            {studentPortalClosed && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 px-3 py-2 text-left text-xs text-red-900 dark:text-red-200">
                The portal is currently closed. Student login is disabled. Coordinators, supervisors, and administrators can still sign in.
              </div>
            )}

            <div className="mb-5 flex rounded-lg bg-slate-100 dark:bg-app-surface p-1">
              <button
                type="button"
                onClick={() => setMode('student')}
                className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  mode === 'student'
                    ? 'bg-white text-violet-700 shadow-sm dark:bg-app-surface dark:text-violet-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setMode('coordinator')}
                className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  mode === 'coordinator'
                    ? 'bg-white text-violet-700 shadow-sm dark:bg-app-surface dark:text-violet-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Coordinator
              </button>
              <button
                type="button"
                onClick={() => setMode('supervisor')}
                className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  mode === 'supervisor'
                    ? 'bg-white text-violet-700 shadow-sm dark:bg-app-surface dark:text-violet-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Supervisor
              </button>
            </div>

            {mode === 'student' ? (
              studentPortalClosed ? (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Contact your coordinator for more information.
                </p>
              ) : (
              <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-4">
                <Input
                  label="Team ID"
                  autoComplete="username"
                  error={studentForm.formState.errors.teamId?.message}
                  {...studentForm.register('teamId')}
                />

                <Input
                  label="Registration No."
                  type="password"
                  autoComplete="current-password"
                  error={studentForm.formState.errors.password?.message}
                  {...studentForm.register('password')}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={studentForm.formState.isSubmitting || !isSupabaseConfigured}
                  className="mt-2"
                >
                  {studentForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
              )
            ) : mode === 'coordinator' ? (
              <form onSubmit={coordinatorForm.handleSubmit(onCoordinatorSubmit)} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="username"
                  error={coordinatorForm.formState.errors.email?.message}
                  {...coordinatorForm.register('email')}
                />

                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  error={coordinatorForm.formState.errors.password?.message}
                  {...coordinatorForm.register('password')}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={coordinatorForm.formState.isSubmitting || !isSupabaseConfigured}
                  className="mt-2"
                >
                  {coordinatorForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            ) : (
              <form onSubmit={supervisorForm.handleSubmit(onSupervisorSubmit)} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="username"
                  error={supervisorForm.formState.errors.identifier?.message}
                  {...supervisorForm.register('identifier')}
                />

                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  error={supervisorForm.formState.errors.password?.message}
                  {...supervisorForm.register('password')}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={supervisorForm.formState.isSubmitting || !isSupabaseConfigured}
                  className="mt-2"
                >
                  {supervisorForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </main>

      <TeamOgFooter />
    </div>
  )
}
