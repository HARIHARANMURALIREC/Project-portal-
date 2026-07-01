/**
 * Sync teams + members from Excel to Supabase without wiping projects or selections.
 *
 * Usage:
 *   npm run sync-teams
 *   npm run sync-teams -- --dry-run
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { isValidTeamCode, parseBatchFile, type ParsedTeam } from './parseBatchExcel'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATA_DIR = path.resolve(process.cwd(), 'data')

const BATCH_FILES: Record<string, string[]> = {
  A: ['IT A - Project Batches.xlsx', 'IT_A_-_Project_Batches.xlsx', 'IV A - Project Batches.xlsx', 'IV_A_-_Project_Batches.xlsx'],
  B: ['IT B - Project Batches.xlsx', 'IT_B_-_Project_Batches.xlsx', 'IV B - Project Batches.xlsx', 'IV_B_-_Project_Batches.xlsx'],
  C: ['IT C - Project Batches.xlsx', 'IT_C_-_Project_Batches.xlsx', 'IV C - Project Batches.xlsx', 'IV_C_-_Project_Batches.xlsx'],
  D: ['IT D - Project Batches.xlsx', 'IT_D_-_Project_Batches.xlsx', 'IV D - Project Batches.xlsx', 'IV_D_-_Project_Batches.xlsx'],
}

const SUPERVISORS_FILE = ['Fixed Supervisors.xlsx', 'Fixed_Supervisors.xlsx']

function resolveDataFile(candidates: string[]): string {
  for (const name of candidates) {
    const p = path.join(DATA_DIR, name)
    if (fs.existsSync(p)) return p
  }
  return path.join(DATA_DIR, candidates[0])
}

function regNoToEmail(regNo: string): string {
  return `${regNo.trim().toLowerCase()}@student.portal`
}

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password: string,
  metadata: { role: string; full_name: string; reg_no?: string },
): Promise<string | null> {
  const { data: list } = await supabase.auth.admin.listUsers()
  const found = list?.users?.find((u) => u.email === email)
  if (found) {
    await supabase.from('profiles').upsert({
      id: found.id,
      role: metadata.role,
      full_name: metadata.full_name,
      reg_no: metadata.reg_no ?? null,
    })
    return found.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: metadata.full_name },
  })

  if (error) {
    console.error(`  Failed to create user ${email}:`, error.message)
    return null
  }

  await supabase.from('profiles').upsert({
    id: data.user.id,
    role: metadata.role,
    full_name: metadata.full_name,
    reg_no: metadata.reg_no ?? null,
  })

  return data.user.id
}

function parseSupervisors(filePath: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!fs.existsSync(filePath)) return map

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][]

  for (const row of rows) {
    const batchCode = String(row[1] ?? '').trim().toUpperCase()
    const supervisor = String(row[4] ?? '').trim()
    if (batchCode && supervisor) map.set(batchCode, supervisor)
  }

  return map
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const allTeams: ParsedTeam[] = []
  const allIssues: { file: string; row: number; message: string }[] = []

  for (const [batchId, filenames] of Object.entries(BATCH_FILES)) {
    const filePath = resolveDataFile(filenames)
    const { teams, issues } = parseBatchFile(filePath, batchId)
    allTeams.push(...teams)
    allIssues.push(...issues)
    console.log(`Parsed ${path.basename(filePath)}: ${teams.length} teams, ${teams.reduce((n, t) => n + t.members.length, 0)} members`)
  }

  const supervisors = parseSupervisors(resolveDataFile(SUPERVISORS_FILE))
  const expectedRegs = new Map<string, ParsedTeam>()
  for (const team of allTeams) {
    for (const member of team.members) {
      expectedRegs.set(member.reg_no, team)
    }
  }

  console.log(`\nTotal: ${allTeams.length} teams, ${expectedRegs.size} students`)
  const multiMember = allTeams.filter((t) => t.members.length === 3)
  if (multiMember.length) {
    console.log(`3-member teams: ${multiMember.map((t) => t.batch_code).join(', ')}`)
  }

  if (allIssues.length) {
    console.log(`\nParse warnings: ${allIssues.length}`)
    for (const issue of allIssues.slice(0, 10)) console.log(`  ${issue.message}`)
  }

  if (dryRun) {
    console.log('\n(dry-run — no database writes)')
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: dbTeams, error: teamsError } = await supabase
    .from('teams')
    .select('id, batch_code, batch_id, team_no, supervisor_name, selected_project_id')
  if (teamsError) {
    console.error('Failed to load teams:', teamsError.message)
    process.exit(1)
  }

  const { data: dbMembers, error: membersError } = await supabase
    .from('team_members')
    .select('id, team_id, reg_no, name, user_id')
  if (membersError) {
    console.error('Failed to load members:', membersError.message)
    process.exit(1)
  }

  const teamByCode = new Map((dbTeams ?? []).map((t) => [t.batch_code.toUpperCase(), t]))
  const memberByReg = new Map((dbMembers ?? []).map((m) => [m.reg_no, m]))

  let teamsCreated = 0
  let teamsUpdated = 0
  let membersInserted = 0
  let membersMoved = 0
  let membersUpdated = 0
  let authLinked = 0

  for (const team of allTeams) {
    const supervisor = team.supervisor_name ?? supervisors.get(team.batch_code) ?? null
    let teamRow = teamByCode.get(team.batch_code)

    if (!teamRow) {
      const { data: created, error } = await supabase
        .from('teams')
        .insert({
          batch_id: team.batch_id,
          team_no: team.team_no,
          batch_code: team.batch_code,
          supervisor_name: supervisor,
        })
        .select('id, batch_code, batch_id, team_no, supervisor_name, selected_project_id')
        .single()

      if (error) {
        console.error(`Failed to create team ${team.batch_code}:`, error.message)
        continue
      }

      teamRow = created
      teamByCode.set(team.batch_code, teamRow)
      teamsCreated++
      console.log(`Created team ${team.batch_code}`)
    } else if (supervisor && teamRow.supervisor_name !== supervisor) {
      await supabase.from('teams').update({ supervisor_name: supervisor }).eq('id', teamRow.id)
      teamsUpdated++
    }

    for (const member of team.members) {
      const existing = memberByReg.get(member.reg_no)

      if (!existing) {
        const { data: inserted, error } = await supabase
          .from('team_members')
          .insert({
            team_id: teamRow.id,
            reg_no: member.reg_no,
            name: member.name,
          })
          .select('id, reg_no, name, team_id, user_id')
          .single()

        if (error) {
          console.error(`Failed to insert ${member.reg_no}:`, error.message)
          continue
        }

        memberByReg.set(member.reg_no, inserted)
        membersInserted++
        console.log(`  Added member ${member.reg_no} → ${team.batch_code}`)
      } else {
        if (existing.team_id !== teamRow.id) {
          await supabase.from('team_members').update({ team_id: teamRow.id }).eq('id', existing.id)
          existing.team_id = teamRow.id
          membersMoved++
          console.log(`  Moved ${member.reg_no} → ${team.batch_code}`)
        }
        if (existing.name !== member.name) {
          await supabase.from('team_members').update({ name: member.name }).eq('id', existing.id)
          membersUpdated++
        }
      }

      const row = memberByReg.get(member.reg_no)!
      if (!row.user_id) {
        const email = regNoToEmail(member.reg_no)
        const userId = await ensureUser(supabase, email, member.reg_no, {
          role: 'student',
          full_name: member.name,
          reg_no: member.reg_no,
        })
        if (userId) {
          await supabase.from('team_members').update({ user_id: userId }).eq('id', row.id)
          row.user_id = userId
          authLinked++
        }
      }
    }
  }

  const invalidTeams = (dbTeams ?? []).filter((t) => !isValidTeamCode(t.batch_code))
  let phantomsRemoved = 0
  for (const phantom of invalidTeams) {
    await supabase.from('team_members').delete().eq('team_id', phantom.id)
    const { error } = await supabase.from('teams').delete().eq('id', phantom.id)
    if (!error) {
      phantomsRemoved++
      console.log(`Deleted phantom team ${phantom.batch_code}`)
    }
  }

  const { data: finalMembers } = await supabase.from('team_members').select('reg_no')
  const missingRegs = [...expectedRegs.keys()].filter((reg) => !finalMembers?.some((m) => m.reg_no === reg))

  const { count: teamCount } = await supabase.from('teams').select('*', { count: 'exact', head: true })

  console.log('\n=== Sync Summary ===')
  console.log(`Teams created: ${teamsCreated}`)
  console.log(`Teams updated: ${teamsUpdated}`)
  console.log(`Members inserted: ${membersInserted}`)
  console.log(`Members moved: ${membersMoved}`)
  console.log(`Members renamed: ${membersUpdated}`)
  console.log(`Auth accounts linked: ${authLinked}`)
  console.log(`Phantom teams removed: ${phantomsRemoved}`)
  console.log(`DB teams now: ${teamCount ?? '?'}`)
  console.log(`DB members now: ${finalMembers?.length ?? 0}`)
  if (missingRegs.length) {
    console.log(`Still missing: ${missingRegs.join(', ')}`)
  } else {
    console.log('All expected students are in the database.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
