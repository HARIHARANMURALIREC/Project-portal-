/**
 * Replace one faculty member across teams, profiles, and auth.
 *
 * Usage:
 *   npx tsx scripts/replace-faculty.ts
 *   npx tsx scripts/replace-faculty.ts --dry-run
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { TEACHER_EMAIL as LEAD_COORDINATOR_EMAIL } from './setup-teacher'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEFAULT_PASSWORD = process.env.TEACHER_DEFAULT_PASSWORD ?? 'Portal@2026'

const OLD_NAME = 'Mr.S.Swamynathan'
const OLD_EMAIL = 'swamynathan.s@rajalakshmi.edu.in'
const NEW_NAME = 'Dr.K.L. Shunmuganathan'
const NEW_EMAIL = 'dean.it@rajalakshmi.edu.in'

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`${dryRun ? '[dry-run] ' : ''}Replacing ${OLD_NAME} → ${NEW_NAME}`)

  const { data: teamsSup, error: teamsSupErr } = await supabase
    .from('teams')
    .select('id, batch_code, supervisor_name, reviewer_name')
    .eq('supervisor_name', OLD_NAME)

  if (teamsSupErr) throw teamsSupErr

  const { data: teamsRev, error: teamsRevErr } = await supabase
    .from('teams')
    .select('id, batch_code, supervisor_name, reviewer_name')
    .eq('reviewer_name', OLD_NAME)

  if (teamsRevErr) throw teamsRevErr

  console.log(`Teams as supervisor: ${teamsSup?.length ?? 0}`)
  for (const t of teamsSup ?? []) {
    console.log(`  ${t.batch_code} supervisor`)
    if (!dryRun) {
      const { error } = await supabase.from('teams').update({ supervisor_name: NEW_NAME }).eq('id', t.id)
      if (error) throw error
    }
  }

  console.log(`Teams as reviewer: ${teamsRev?.length ?? 0}`)
  for (const t of teamsRev ?? []) {
    console.log(`  ${t.batch_code} reviewer`)
    if (!dryRun) {
      const { error } = await supabase.from('teams').update({ reviewer_name: NEW_NAME }).eq('id', t.id)
      if (error) throw error
    }
  }

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, supervisor_name, role')
    .or(`supervisor_name.eq.${OLD_NAME},full_name.eq.${OLD_NAME}`)

  if (profErr) throw profErr

  console.log(`Profiles to update: ${profiles?.length ?? 0}`)
  for (const p of profiles ?? []) {
    console.log(`  profile ${p.id} (${p.role})`)
    if (!dryRun) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: NEW_NAME,
          supervisor_name: p.supervisor_name === OLD_NAME ? NEW_NAME : p.supervisor_name,
        })
        .eq('id', p.id)
      if (error) throw error
    }
  }

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw listErr

  const oldUser = (list?.users ?? []).find(
    (u) => u.email?.toLowerCase() === OLD_EMAIL.toLowerCase(),
  )
  const existingNew = (list?.users ?? []).find(
    (u) => u.email?.toLowerCase() === NEW_EMAIL.toLowerCase(),
  )

  if (oldUser) {
    console.log(`Found old auth user: ${oldUser.email}`)
    if (!dryRun) {
      if (existingNew && existingNew.id !== oldUser.id) {
        console.log('New email already belongs to another account — updating that account and removing old')
        const { error } = await supabase.auth.admin.updateUserById(existingNew.id, {
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: NEW_NAME },
        })
        if (error) throw error
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: existingNew.id,
          role: 'teacher',
          full_name: NEW_NAME,
          supervisor_name: NEW_NAME,
          reg_no: null,
        })
        if (profileError) throw profileError
        try {
          const { error: delErr } = await supabase.auth.admin.deleteUser(oldUser.id)
          if (delErr) console.warn('  Could not delete old user (may have FK refs):', delErr.message)
        } catch {
          console.warn('  Could not delete old user — disable by updating email to archived alias')
          await supabase.auth.admin.updateUserById(oldUser.id, {
            email: `archived+${oldUser.id.slice(0, 8)}@rajalakshmi.edu.in`,
            user_metadata: { full_name: 'ARCHIVED', archived: true },
          })
        }
      } else {
        const { error } = await supabase.auth.admin.updateUserById(oldUser.id, {
          email: NEW_EMAIL,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: NEW_NAME },
        })
        if (error) throw error
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: oldUser.id,
          role: 'teacher',
          full_name: NEW_NAME,
          supervisor_name: NEW_NAME,
          reg_no: null,
        })
        if (profileError) throw profileError
        console.log('  Updated existing account email to new faculty')
      }
    }
  } else if (existingNew) {
    console.log(`Updating existing auth user: ${NEW_EMAIL}`)
    if (!dryRun) {
      const { error } = await supabase.auth.admin.updateUserById(existingNew.id, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: NEW_NAME },
      })
      if (error) throw error
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: existingNew.id,
        role: 'teacher',
        full_name: NEW_NAME,
        supervisor_name: NEW_NAME,
        reg_no: null,
      })
      if (profileError) throw profileError
    }
  } else {
    console.log(`Creating auth user: ${NEW_EMAIL}`)
    if (!dryRun) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: NEW_EMAIL,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: NEW_NAME },
      })
      if (error || !data.user) throw error ?? new Error('createUser failed')
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        role: 'teacher',
        full_name: NEW_NAME,
        supervisor_name: NEW_NAME,
        reg_no: null,
      })
      if (profileError) throw profileError
    }
  }

  console.log(`\n${dryRun ? '[dry-run] ' : ''}Done.`)
  console.log(`New login: ${NEW_EMAIL} / ${DEFAULT_PASSWORD}`)
  console.log(`Lead coordinator (${LEAD_COORDINATOR_EMAIL}) unchanged.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
