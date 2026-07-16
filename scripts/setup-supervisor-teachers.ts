/**
 * Create one teacher login per supervisor using emails from Faculty Namelist.xlsx.
 * Does not create or modify the lead coordinator (baburathinam@rec.edu).
 *
 * Usage:
 *   npm run setup-supervisor-teachers
 *   npm run setup-supervisor-teachers:dry-run
 *   npm run setup-supervisor-teachers -- "data/Faculty Namelist.xlsx"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env
 * Run migration 0013_teacher_supervisor_scope.sql on Supabase first.
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { TEACHER_EMAIL as LEAD_COORDINATOR_EMAIL } from './setup-teacher'
import {
  buildFacultyLookup,
  lookupFacultyForSupervisor,
  parseFacultyNamelist,
} from './faculty-namelist'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEFAULT_PASSWORD = process.env.TEACHER_DEFAULT_PASSWORD ?? 'Portal@2026'

async function ensureTeacher(
  supabase: ReturnType<typeof createClient>,
  supervisorName: string,
  canonicalName: string,
  email: string,
  dryRun: boolean,
): Promise<{ email: string; password: string; supervisor: string } | null> {
  if (email.toLowerCase() === LEAD_COORDINATOR_EMAIL) {
    console.log(`  Skip ${supervisorName}: reserved for lead coordinator`)
    return null
  }

  const password = DEFAULT_PASSWORD

  if (dryRun) {
    return { email, password, supervisor: canonicalName }
  }

  const { data: list } = await supabase.auth.admin.listUsers()
  const existingByEmail = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  const existingByName = list?.users?.find(
    (u) =>
      (u.user_metadata?.full_name as string | undefined)?.trim() === canonicalName.trim() ||
      (u.user_metadata?.full_name as string | undefined)?.trim() === supervisorName.trim(),
  )
  const existing = existingByEmail ?? existingByName
  let userId = existing?.id

  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: canonicalName },
    })
    if (error) {
      console.error(`  Failed to update ${email}:`, error.message)
      return null
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: canonicalName },
    })
    if (error || !data.user) {
      console.error(`  Failed to create ${email}:`, error?.message)
      return null
    }
    userId = data.user.id
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role: 'teacher',
    full_name: canonicalName,
    supervisor_name: canonicalName,
    reg_no: null,
  })

  if (profileError) {
    console.error(`  Failed to upsert profile for ${email}:`, profileError.message)
    return null
  }

  return { email, password, supervisor: canonicalName }
}

async function normalizeTeamSupervisorNames(
  supabase: ReturnType<typeof createClient>,
  lookup: ReturnType<typeof buildFacultyLookup>,
  dryRun: boolean,
): Promise<number> {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, batch_code, supervisor_name')
    .not('supervisor_name', 'is', null)

  if (error) {
    console.error('Failed to load teams for normalization:', error.message)
    return 0
  }

  let updated = 0
  for (const team of teams ?? []) {
    const current = team.supervisor_name as string
    const faculty = lookupFacultyForSupervisor(current, lookup)
    if (!faculty || faculty.name === current) continue

    console.log(`  Normalize team ${team.batch_code}: "${current}" → "${faculty.name}"`)
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('teams')
        .update({ supervisor_name: faculty.name })
        .eq('id', team.id)
      if (updateError) {
        console.error(`    Failed: ${updateError.message}`)
        continue
      }
    }
    updated++
  }
  return updated
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const fileArg = process.argv.find((a) => a.endsWith('.xlsx'))
  const namelistPath = fileArg ? path.resolve(process.cwd(), fileArg) : undefined

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const facultyRows = parseFacultyNamelist(namelistPath)
  const lookup = buildFacultyLookup(facultyRows)
  console.log(`Loaded ${facultyRows.length} faculty row(s) from Faculty Namelist`)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`Lead coordinator (${LEAD_COORDINATOR_EMAIL}) is not modified by this script.`)

  const normalizedTeams = await normalizeTeamSupervisorNames(supabase, lookup, dryRun)
  if (normalizedTeams > 0) {
    console.log(`${dryRun ? '[dry-run] ' : ''}Normalized ${normalizedTeams} team supervisor name(s)`)
  }

  const { data: teams, error } = await supabase
    .from('teams')
    .select('supervisor_name')
    .not('supervisor_name', 'is', null)

  if (error) {
    console.error('Failed to load supervisors:', error.message)
    process.exit(1)
  }

  const supervisors = [...new Set((teams ?? []).map((t) => t.supervisor_name as string).filter(Boolean))].sort()

  console.log(`Found ${supervisors.length} distinct supervisor(s) on teams`)

  const usedEmails = new Set<string>()
  const credentials: { supervisor: string; email: string; password: string }[] = []

  for (const supervisor of supervisors) {
    const faculty = lookupFacultyForSupervisor(supervisor, lookup)
    if (!faculty) {
      console.error(`  No faculty email for "${supervisor}" — add to Faculty Namelist.xlsx`)
      continue
    }

    const email = faculty.email
    if (usedEmails.has(email)) {
      console.log(`  ${supervisor} → ${email} (shared account)`)
      continue
    }
    usedEmails.add(email)

    console.log(`  ${supervisor} → ${email}`)
    const row = await ensureTeacher(supabase, supervisor, faculty.name, email, dryRun)
    if (row) credentials.push(row)
  }

  const outPath = path.resolve(process.cwd(), 'data/supervisor-teacher-logins.csv')
  if (!dryRun && credentials.length > 0) {
    const lines = ['Supervisor,Email,Password', ...credentials.map((c) => `"${c.supervisor}","${c.email}","${c.password}"`)]
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
    console.log(`\nWrote credentials to ${outPath}`)
  }

  console.log(`\n${dryRun ? '[dry-run] ' : ''}Done: ${credentials.length} supervisor account(s)`)
  console.log(`Default supervisor password: ${DEFAULT_PASSWORD}`)
  console.log('Supervisors sign in on the Supervisor tab with their @rajalakshmi.edu.in email.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
