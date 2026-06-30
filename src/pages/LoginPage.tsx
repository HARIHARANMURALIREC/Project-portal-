import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase, resolveLoginEmail } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AppLogo } from '@/components/AppLogo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { branding } from '@/config/branding'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or registration number is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, loading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (!loading && profile) {
      const path = profile.role === 'admin' ? '/admin' : profile.role === 'teacher' ? '/teacher' : '/student'
      navigate(path, { replace: true })
    }
  }, [profile, loading, navigate])

  async function onSubmit(data: LoginForm) {
    let email: string
    try {
      email = resolveLoginEmail(data.identifier)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid login ID')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    })

    if (error) {
      const hint =
        error.message === 'Invalid login credentials'
          ? ' Check your Reg.No. or email and password.'
          : ''
      toast.error(error.message + hint)
      return
    }

    toast.success('Signed in successfully')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="bg-white px-6 py-4 sm:px-10">
        <div className="inline-flex flex-col items-start gap-3">
          <AppLogo size="lg" showCollegeName={false} showPortalTitle={false} />
          <div className="h-px w-16 bg-slate-200" aria-hidden />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Card padding="lg" className="border-slate-200 shadow-lg ring-1 ring-slate-100">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-900">{branding.portalTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email or Registration No."
                autoComplete="username"
                placeholder="e.g. 2116231001001"
                error={errors.identifier?.message}
                {...register('identifier')}
              />

              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Same as your Reg.No."
                error={errors.password?.message}
                {...register('password')}
              />

              <Button type="submit" fullWidth size="lg" disabled={isSubmitting} className="mt-2">
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Card>
        </div>
      </main>

      <footer className="px-6 py-6 text-center">
        <p className="text-sm text-slate-500">
          Developed with <span className="heart-rgb" aria-label="love">♥</span> TEAM OG
        </p>
      </footer>
    </div>
  )
}
