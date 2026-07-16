/**
 * Delete legacy @teacher.portal supervisor auth accounts.
 * Faculty @rajalakshmi.edu.in accounts are kept.
 *
 * Usage:
 *   npm run remove-teacher-portal-accounts
 *   npm run remove-teacher-portal-accounts:dry-run
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { TEACHER_EMAIL as LEAD_COORDINATOR_EMAIL } from './setup-teacher'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const LEGACY_DOMAIN = '@teacher.portal'

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: list, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    console.error('Failed to list users:', error.message)
    process.exit(1)
  }

  const legacy = (list?.users ?? []).filter((u) => {
    const email = u.email?.toLowerCase() ?? ''
    return email.endsWith(LEGACY_DOMAIN) && email !== LEAD_COORDINATOR_EMAIL.toLowerCase()
  })

  if (legacy.length === 0) {
    console.log('No @teacher.portal accounts found.')
    return
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}Found ${legacy.length} legacy account(s):`)
  for (const user of legacy) {
    console.log(`  - ${user.email}`)
    if (!dryRun) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error(`    Failed to delete ${user.email}:`, deleteError.message)
      } else {
        console.log(`    Deleted`)
      }
    }
  }

  console.log(`\n${dryRun ? '[dry-run] ' : ''}Done. Supervisors must use @rajalakshmi.edu.in emails only.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
