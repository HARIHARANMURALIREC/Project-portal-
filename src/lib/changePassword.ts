import { createClient } from '@supabase/supabase-js'
import { supabase, supabaseClientConfig } from '@/lib/supabase'

/**
 * Change the signed-in user's password.
 * Verifies the current password on a throwaway client so we do not disturb the
 * app session / onAuthStateChange (which remounts profile forms).
 */
export async function changeSignedInPassword(input: {
  email: string
  currentPassword: string
  newPassword: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = input.email.trim().toLowerCase()
  if (!email) {
    return { ok: false, message: 'Unable to verify your account.' }
  }

  if (input.currentPassword === input.newPassword) {
    return { ok: false, message: 'New password must be different from your current password.' }
  }

  if (!supabaseClientConfig) {
    return { ok: false, message: 'Supabase is not configured.' }
  }

  const verifyClient = createClient(supabaseClientConfig.url, supabaseClientConfig.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    },
  })

  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email,
    password: input.currentPassword,
  })

  if (verifyError) {
    return { ok: false, message: 'Current password is incorrect.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: input.newPassword,
  })

  if (updateError) {
    const msg = updateError.message.toLowerCase()
    if (msg.includes('different') || msg.includes('same')) {
      return { ok: false, message: 'New password must be different from your current password.' }
    }
    if (msg.includes('weak') || msg.includes('least') || msg.includes('characters')) {
      return { ok: false, message: updateError.message }
    }
    return { ok: false, message: updateError.message }
  }

  return { ok: true }
}
