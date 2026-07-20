/**
 * Create or update a batch (section) coordinator login.
 * The profile's supervisor_name must exactly match the batch_coordinators row
 * so RLS and the frontend recognize them as the section coordinator.
 *
 * Usage:
 *   npm run setup-batch-coordinator                     # defaults to Vinoth kumar / batch D
 *   npm run setup-batch-coordinator -- --email vinothkumar.r@rajalakshmi.edu.in --name "Mr.R.Vinoth kumar" --password "Portal@2026"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

const EMAIL = (argValue('--email') ?? 'vinothkumar.r@rajalakshmi.edu.in').toLowerCase()
const SUPERVISOR_NAME = argValue('--name') ?? 'Mr.R.Vinoth kumar'
const PASSWORD = argValue('--password') ?? process.env.TEACHER_DEFAULT_PASSWORD ?? 'Portal@2026'

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env')
    console.error('Get the service role key from: Supabase Dashboard → Settings → API Keys')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify this supervisor name is registered as a batch coordinator
  const { data: coordinatorRow, error: coordError } = await supabase
    .from('batch_coordinators')
    .select('batch_id, supervisor_name')
    .eq('supervisor_name', SUPERVISOR_NAME)
    .maybeSingle()

  if (coordError) {
    console.error('Failed to check batch_coordinators:', coordError.message)
    process.exit(1)
  }
  if (!coordinatorRow) {
    console.error(`"${SUPERVISOR_NAME}" is not in batch_coordinators — add the row first (migration 0017).`)
    process.exit(1)
  }

  console.log(`Setting up coordinator for batch ${coordinatorRow.batch_id}: ${SUPERVISOR_NAME} <${EMAIL}>`)

  const { data: list, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list users:', listError.message)
    process.exit(1)
  }

  const existing = list.users.find((u) => u.email?.toLowerCase() === EMAIL)
  let userId = existing?.id

  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: SUPERVISOR_NAME },
    })
    if (error) {
      console.error('Failed to update user:', error.message)
      process.exit(1)
    }
    console.log('Updated existing auth user.')
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: SUPERVISOR_NAME },
    })
    if (error || !data.user) {
      console.error('Failed to create user:', error?.message)
      process.exit(1)
    }
    userId = data.user.id
    console.log('Created new auth user.')
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role: 'teacher',
    full_name: SUPERVISOR_NAME,
    supervisor_name: SUPERVISOR_NAME,
    reg_no: null,
  })

  if (profileError) {
    console.error('Failed to upsert profile:', profileError.message)
    process.exit(1)
  }

  console.log('Done.')
  console.log(`  Batch:    ${coordinatorRow.batch_id}`)
  console.log(`  Email:    ${EMAIL}`)
  console.log(`  Password: ${PASSWORD}`)
  console.log('Sign in on the Coordinator tab. The batch dashboard appears for their section.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
