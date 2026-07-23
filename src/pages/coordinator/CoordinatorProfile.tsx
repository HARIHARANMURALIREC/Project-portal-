import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CoordinatorPageShell } from '@/components/coordinator/CoordinatorPageShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { changeSignedInPassword } from '@/lib/changePassword'
import { coordinatorRoleLabel } from '@/lib/teacherRoutes'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

function CoordinatorProfileContent() {
  const { profile, user } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  async function onChangePassword(data: ChangePasswordForm) {
    if (!user?.email) {
      toast.error('Unable to verify your account.')
      return
    }

    setChangingPassword(true)
    try {
      const result = await changeSignedInPassword({
        email: user.email,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      passwordForm.reset()
      toast.success('Password updated successfully. Use your new password next time you sign in.')
    } finally {
      setChangingPassword(false)
    }
  }

  const roleLabel = coordinatorRoleLabel(profile)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card padding="lg" className="border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Coordinator Profile</h3>
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Full Name</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{profile?.full_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Role</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{roleLabel}</dd>
          </div>
        </dl>
      </Card>

      <Card padding="lg" className="border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update your coordinator portal password. You will stay signed in after changing it.
        </p>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="mt-6 space-y-4">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <Button
            type="submit"
            disabled={changingPassword || passwordForm.formState.isSubmitting}
          >
            {changingPassword ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Card>

      <Card padding="lg" className="border-violet-100 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20">
        <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200">Quick links</h3>
        <ul className="mt-3 space-y-2 text-sm text-violet-800 dark:text-violet-300">
          <li>Dashboard — view and manage all team review schedules</li>
          <li>Uploads — track PDF and PPT submissions across all teams</li>
          <li>Marks — view and manage review marks</li>
        </ul>
      </Card>
    </div>
  )
}

export function CoordinatorProfile() {
  return (
    <CoordinatorPageShell title="Profile" activeNav="profile">
      <CoordinatorProfileContent />
    </CoordinatorPageShell>
  )
}
