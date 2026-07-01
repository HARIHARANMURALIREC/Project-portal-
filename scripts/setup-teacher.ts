/**
 * Replace all teacher accounts with a single teacher login.
 *
 * Usage:
 *   npm run setup-teacher
 *   npm run setup-teacher -- --dry-run
 */

import 'dotenv/config'
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

  const { data: teachers, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'teacher')

  if (error) {
    console.error('Failed to load teacher profiles:', error.message)
    process.exit(1)
  }

  console.log(`Found ${teachers?.length ?? 0} existing teacher profile(s)`)

  for (const teacher of teachers ?? []) {
    if (teacher.id) {
      console.log(`  Remove teacher: ${teacher.full_name ?? teacher.id}`)
      if (!dryRun) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(teacher.id)
        if (deleteError) {
          console.error(`    Failed to delete ${teacher.id}:`, deleteError.message)
        }
      }
    }
  }

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const staleTeacherUsers =
    existingUsers?.users?.filter(
      (u) =>
        u.email?.endsWith('@teacher.portal') ||
        (u.email?.toLowerCase() === TEACHER_EMAIL && !teachers?.some((t) => t.id === u.id)),
    ) ?? []

  for (const user of staleTeacherUsers) {
    if (teachers?.some((t) => t.id === user.id)) continue
    console.log(`  Remove stale auth user: ${user.email}`)
    if (!dryRun) {
      await supabase.auth.admin.deleteUser(user.id)
    }
  }

  console.log(`\nCreate teacher: ${TEACHER_EMAIL}`)
  if (dryRun) {
    console.log('(dry-run — no user created)')
    return
  }

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
      console.error('Failed to update teacher user:', updateError.message)
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
      console.error('Failed to create teacher user:', createError?.message)
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
    console.error('Failed to upsert teacher profile:', profileError.message)
    process.exit(1)
  }

  console.log('Done.')
  console.log(`  Email:    ${TEACHER_EMAIL}`)
  console.log(`  Password: ${TEACHER_PASSWORD}`)
}

main()
