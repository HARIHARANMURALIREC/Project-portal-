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
import { isCoordinatorPortalUser, isBatchCoordinatorSupervisor, teacherHomePath } from '@/lib/teacherRoutes'
import { isSectionReviewer, isSectionReviewerEmail } from '@/lib/sectionReviewers'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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

type LoginMode = 'student' | 'coordinator' | 'supervisor' | 'reviewer'

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

  const reviewerForm = useForm<SupervisorLoginForm>({
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

    if (isSectionReviewerEmail(email)) {
      toast.error('Use the Reviewer tab to sign in.')
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

    if (!loginProfile) {
      await clearLocalAuthSession()
      toast.error('Your account profile is missing. Contact the administrator to set up your account.')
      return
    }

    // Admin accounts sign in via the Coordinator tab
    if (loginProfile.role === 'admin') {
      toast.success('Signed in successfully')
      navigate('/admin', { replace: true })
      return
    }

    if (!isCoordinatorPortalUser(loginProfile)) {
      await clearLocalAuthSession()
      toast.error(
        isSectionReviewer(loginProfile)
          ? 'This account is a section reviewer. Sign in on the Reviewer tab.'
          : 'This account is not a coordinator. Sign in on the Supervisor tab.',
      )
      return
    }

    toast.success('Signed in successfully')
    navigate('/coordinator', { replace: true })
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

    if (isCoordinatorPortalUser(loginProfile) && !isBatchCoordinatorSupervisor(loginProfile)) {
      await clearLocalAuthSession()
      toast.error('This account is a batch coordinator. Please sign in on the Coordinator tab instead.')
      return
    }

    if (!loginProfile) {
      await clearLocalAuthSession()
      toast.error('Your account profile is missing. Contact the administrator to set up your account.')
      return
    }

    toast.success('Signed in successfully')
    navigate(teacherHomePath(loginProfile), { replace: true })
  }

  async function onReviewerSubmit(data: SupervisorLoginForm) {
    if (!isSupabaseConfigured) {
      toast.error(supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    const email = data.identifier.trim().toLowerCase()
    if (!isSectionReviewerEmail(email)) {
      toast.error('Use reviewer1@gmail.com or reviewer2@gmail.com on this tab.')
      return
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    })

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'Check your reviewer email and password.'
          : error.message,
      )
      return
    }

    const loginProfile = authData.user ? await fetchLoginProfile(authData.user.id) : null
    if (!isSectionReviewer(loginProfile)) {
      await clearLocalAuthSession()
      toast.error('This account is not a section reviewer.')
      return
    }

    toast.success('Signed in successfully')
    navigate('/reviewer', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-app-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-violet-50 via-slate-50 to-sky-50 dark:from-app-black dark:via-slate-950 dark:to-violet-950">
      {/* Soft color orbs so the glass panel has something to refract */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-600/20" />
        <div className="absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-sky-300/35 blur-3xl dark:bg-sky-600/15" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-fuchsia-200/30 blur-3xl dark:bg-fuchsia-700/10" />
      </div>

      {/* College crest watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <img
          src={branding.logoSrc}
          alt=""
          className="h-[min(72vh,30rem)] w-auto max-w-[min(92vw,30rem)] select-none object-contain opacity-30 mix-blend-multiply dark:opacity-40 dark:mix-blend-screen"
        />
      </div>

      <header className="relative z-40 sticky top-0 border-b border-white/30 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-black/30">
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
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-white/50 bg-white/35 p-6 shadow-[0_8px_32px_rgba(31,38,135,0.12)] ring-1 ring-white/60 backdrop-blur-2xl dark:border-white/15 dark:bg-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] dark:ring-white/10">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{branding.portalTitle}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Sign in to continue</p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-left text-xs text-amber-900 backdrop-blur-sm dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
                {supabaseConfigError}
              </div>
            )}

            {studentPortalClosed && (
              <div className="mb-4 rounded-lg border border-red-200/80 bg-red-50/70 px-3 py-2 text-left text-xs text-red-900 backdrop-blur-sm dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-200">
                The portal is currently closed. Student login is disabled. Coordinators, supervisors, reviewers, and administrators can still sign in.
              </div>
            )}

            <div className="mb-5 flex rounded-xl border border-white/40 bg-white/25 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setMode('student')}
                className={`flex-1 rounded-lg px-1.5 py-2 text-[11px] font-medium transition sm:px-2 sm:text-sm ${
                  mode === 'student'
                    ? 'bg-white/90 text-violet-700 shadow-sm backdrop-blur-sm dark:bg-white/20 dark:text-violet-200'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setMode('coordinator')}
                className={`flex-1 rounded-lg px-1.5 py-2 text-[11px] font-medium transition sm:px-2 sm:text-sm ${
                  mode === 'coordinator'
                    ? 'bg-white/90 text-violet-700 shadow-sm backdrop-blur-sm dark:bg-white/20 dark:text-violet-200'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                Coordinator
              </button>
              <button
                type="button"
                onClick={() => setMode('supervisor')}
                className={`flex-1 rounded-lg px-1.5 py-2 text-[11px] font-medium transition sm:px-2 sm:text-sm ${
                  mode === 'supervisor'
                    ? 'bg-white/90 text-violet-700 shadow-sm backdrop-blur-sm dark:bg-white/20 dark:text-violet-200'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                Supervisor
              </button>
              <button
                type="button"
                onClick={() => setMode('reviewer')}
                className={`flex-1 rounded-lg px-1.5 py-2 text-[11px] font-medium transition sm:px-2 sm:text-sm ${
                  mode === 'reviewer'
                    ? 'bg-white/90 text-violet-700 shadow-sm backdrop-blur-sm dark:bg-white/20 dark:text-violet-200'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                Reviewer
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
                  className="border-white/50 !bg-white/45 backdrop-blur-sm dark:border-white/15 dark:!bg-white/10"
                  error={studentForm.formState.errors.teamId?.message}
                  {...studentForm.register('teamId')}
                />

                <Input
                  label="Registration No."
                  type="password"
                  autoComplete="current-password"
                  className="border-white/50 !bg-white/45 backdrop-blur-sm dark:border-white/15 dark:!bg-white/10"
                  error={studentForm.formState.errors.password?.message}
                  {...studentForm.register('password')}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={studentForm.formState.isSubmitting || !isSupabaseConfigured}
                  className="mt-2 shadow-lg shadow-violet-500/25"
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
                  className="border-white/50 !bg-white/45 backdrop-blur-sm dark:border-white/15 dark:!bg-white/10"
                  error={coordinatorForm.formState.errors.email?.message}
                  {...coordinatorForm.register('email')}
                />

                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  className="border-white/50 !bg-white/45 backdrop-blur-sm dark:border-white/15 dark:!bg-white/10"
                  error={coordinatorForm.formState.errors.password?.message}
                  {...coordinatorForm.register('password')}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={coordinatorForm.formState.isSubmitting || !isSupabaseConfigured}
                  className="mt-2 shadow-lg shadow-violet-500/25"
                >
                  {coordinatorForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            ) : mode === 'reviewer' ? (
              <form onSubmit={reviewerForm.handleSubmit(onReviewerSubmit)} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="username"
                  className="border-white/50 !bg-white/45 backdrop-blur-sm dark:border-white/15 dark:!bg-white/10"
                  error={reviewerForm.formState.errors.identifier?.message}
                  {...reviewerForm.register('identifier')}
                />

                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  className="border-white/50 !bg-white/45 backdrop-blur-sm dark:border-white/15 dark:!bg-white/10"
                  error={reviewerForm.formState.errors.password?.message}
                  {...reviewerForm.register('password')}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={reviewerForm.formState.isSubmitting || !isSupabaseConfigured}
                  className="mt-2 shadow-lg shadow-violet-500/25"
                >
                  {reviewerForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            ) : (
              <form onSubmit={supervisorForm.handleSubmit(onSupervisorSubmit)} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="username"
                  className="border-white/50 !bg-white/45 backdrop-blur-sm dark:border-white/15 dark:!bg-white/10"
                  error={supervisorForm.formState.errors.identifier?.message}
                  {...supervisorForm.register('identifier')}
                />

                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  className="border-white/50 !bg-white/45 backdrop-blur-sm dark:border-white/15 dark:!bg-white/10"
                  error={supervisorForm.formState.errors.password?.message}
                  {...supervisorForm.register('password')}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={supervisorForm.formState.isSubmitting || !isSupabaseConfigured}
                  className="mt-2 shadow-lg shadow-violet-500/25"
                >
                  {supervisorForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <div className="relative z-10">
        <TeamOgFooter />
      </div>
    </div>
  )
}
