/**
 * Create or update the two section reviewer portal accounts.
 *
 * Reviewer 1: A & B  — reviewer1@gmail.com
 * Reviewer 2: C & D  — reviewer2@gmail.com
 *
 * Usage:
 *   npm run setup-section-reviewers
 *   npm run setup-section-reviewers -- --dry-run
 */

import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { SECTION_REVIEWERS } from '../src/lib/sectionReviewers'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const REVIEWER_PASSWORD = 'Portal@rec'

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('Section reviewer accounts:')
  for (const reviewer of SECTION_REVIEWERS) {
    console.log(`  ${reviewer.fullName}: ${reviewer.email} (${reviewer.batchIds.join(' & ')})`)
  }

  if (dryRun) {
    console.log('(dry-run — no changes)')
    return
  }

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.error('Failed to list users:', listError.message)
    process.exit(1)
  }

  for (const reviewer of SECTION_REVIEWERS) {
    const existing = existingUsers.users.find((u) => u.email?.toLowerCase() === reviewer.email)
    let userId = existing?.id

    if (userId) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        email: reviewer.email,
        password: REVIEWER_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: reviewer.fullName },
      })
      if (updateError) {
        console.error(`Failed to update ${reviewer.email}:`, updateError.message)
        process.exit(1)
      }
    } else {
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: reviewer.email,
        password: REVIEWER_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: reviewer.fullName },
      })
      if (createError || !data.user) {
        console.error(`Failed to create ${reviewer.email}:`, createError?.message)
        process.exit(1)
      }
      userId = data.user.id
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'teacher',
      full_name: reviewer.fullName,
      supervisor_name: reviewer.supervisorName,
      reg_no: null,
    })

    if (profileError) {
      console.error(`Failed to upsert profile for ${reviewer.email}:`, profileError.message)
      process.exit(1)
    }

    console.log(`Ready: ${reviewer.email}`)
  }

  console.log('Done.')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
