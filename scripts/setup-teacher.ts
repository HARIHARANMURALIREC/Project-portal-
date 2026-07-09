/**
 * Create or update the lead coordinator account (Baburathinam) only.
 * Does not touch supervisor @teacher.portal accounts.
 *
 * Usage:
 *   npm run setup-teacher
 *   npm run setup-teacher -- --dry-run
 */

import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const TEACHER_EMAIL = 'baburathinam@rec.edu'
export const TEACHER_PASSWORD = 'baburathinam@rec'
const TEACHER_NAME = 'Baburathinam'

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`Lead coordinator only: ${TEACHER_EMAIL}`)
  console.log('Supervisor @teacher.portal accounts are not modified.')
  if (dryRun) {
    console.log('(dry-run — no changes)')
    return
  }

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === TEACHER_EMAIL)
  let userId = existing?.id

  if (userId) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email: TEACHER_EMAIL,
      password: TEACHER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: TEACHER_NAME },
    })
    if (updateError) {
      console.error('Failed to update coordinator user:', updateError.message)
      process.exit(1)
    }
  } else {
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: TEACHER_EMAIL,
      password: TEACHER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: TEACHER_NAME },
    })
    if (createError || !data.user) {
      console.error('Failed to create coordinator user:', createError?.message)
      process.exit(1)
    }
    userId = data.user.id
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role: 'teacher',
    full_name: TEACHER_NAME,
    supervisor_name: null,
    reg_no: null,
  })

  if (profileError) {
    console.error('Failed to upsert coordinator profile:', profileError.message)
    process.exit(1)
  }

  console.log('Done.')
  console.log(`  Email:    ${TEACHER_EMAIL}`)
  console.log(`  Password: ${TEACHER_PASSWORD}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
