import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ReviewerPageShell } from '@/components/reviewer/ReviewerPageShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { changeSignedInPassword } from '@/lib/changePassword'
import { getSectionReviewerLabel } from '@/lib/sectionReviewers'

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

function ReviewerProfileContent() {
  const { profile, user } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)
  const sectionLabel = getSectionReviewerLabel(profile)

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card padding="lg" className="border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reviewer Profile</h3>
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
            <dt className="text-sm text-slate-500 dark:text-slate-400">Sections</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{sectionLabel}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Role</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">Section Reviewer</dd>
          </div>
        </dl>
      </Card>

      <Card padding="lg" className="border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update your reviewer portal password. You will stay signed in after changing it.
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
          <Button type="submit" disabled={changingPassword || passwordForm.formState.isSubmitting}>
            {changingPassword ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function ReviewerProfile() {
  return (
    <ReviewerPageShell title="Profile" activeNav="profile">
      <ReviewerProfileContent />
    </ReviewerPageShell>
  )
}
