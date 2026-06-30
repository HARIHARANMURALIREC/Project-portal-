/**
 * Set every student account password to their registration number.
 *
 * Usage:
 *   npm run reset-student-passwords
 *   npm run reset-student-passwords -- --dry-run
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: students, error } = await supabase
    .from('profiles')
    .select('id, reg_no, full_name')
    .eq('role', 'student')
    .not('reg_no', 'is', null)
    .order('reg_no')

  if (error) {
    console.error('Failed to load student profiles:', error.message)
    process.exit(1)
  }

  if (!students?.length) {
    console.log('No student profiles found.')
    return
  }

  console.log(`=== Reset student passwords ${dryRun ? '(dry-run) ' : ''}===\n`)
  console.log(`Students to update: ${students.length}\n`)

  let updated = 0
  let failed = 0

  for (const student of students) {
    const regNo = student.reg_no!.trim()
    if (!regNo) {
      console.warn(`  Skip ${student.id}: empty reg_no`)
      failed++
      continue
    }

    if (dryRun) {
      console.log(`  ${regNo} → password set to reg no (${student.full_name ?? '—'})`)
      updated++
      continue
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(student.id, {
      password: regNo,
    })

    if (updateError) {
      console.error(`  FAILED ${regNo}: ${updateError.message}`)
      failed++
    } else {
      updated++
      if (updated % 50 === 0) console.log(`  … ${updated} updated`)
    }
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`)
  if (!dryRun) {
    console.log('Students can sign in with Reg.No. as both username and password.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
