/**
 * One-time data import script for Project Allotment Portal.
 *
 * Usage:
 *   1. Place Excel files in ./data/
 *   2. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env (or env vars)
 *   3. Run: npm run import-data
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD ?? 'Portal@2026'

const BATCH_FILES: Record<string, string[]> = {
  A: ['IT A - Project Batches.xlsx', 'IT_A_-_Project_Batches.xlsx', 'IV A - Project Batches.xlsx', 'IV_A_-_Project_Batches.xlsx'],
  B: ['IT B - Project Batches.xlsx', 'IT_B_-_Project_Batches.xlsx', 'IV B - Project Batches.xlsx', 'IV_B_-_Project_Batches.xlsx'],
  C: ['IT C - Project Batches.xlsx', 'IT_C_-_Project_Batches.xlsx', 'IV C - Project Batches.xlsx', 'IV_C_-_Project_Batches.xlsx'],
  D: ['IT D - Project Batches.xlsx', 'IT_D_-_Project_Batches.xlsx', 'IV D - Project Batches.xlsx', 'IV_D_-_Project_Batches.xlsx'],
}

const SUPERVISORS_FILE = ['Fixed Supervisors.xlsx', 'Fixed_Supervisors.xlsx']
const PROJECTS_FILE = ['List of Proposed Project Titles.xlsx', 'List_of_Proposed_Project_Titles.xlsx']

function resolveDataFile(candidates: string[]): string {
  for (const name of candidates) {
    const p = path.join(DATA_DIR, name)
    if (fs.existsSync(p)) return p
  }
  return path.join(DATA_DIR, candidates[0])
}

interface ParsedMember {
  reg_no: string
  name: string
}

interface ParsedTeam {
  batch_id: string
  team_no: number
  batch_code: string
  members: ParsedMember[]
  supervisor_name: string | null
}

interface ParseIssue {
  file: string
  row: number
  message: string
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c)
    if (idx >= 0) return idx
  }
  return -1
}

function parseBatchFile(filePath: string, batchId: string): { teams: ParsedTeam[]; issues: ParseIssue[] } {
  const issues: ParseIssue[] = []
  const teams: ParsedTeam[] = []

  if (!fs.existsSync(filePath)) {
    issues.push({ file: filePath, row: 0, message: 'File not found' })
    return { teams, issues }
  }

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][]

  if (rows.length < 2) {
    issues.push({ file: filePath, row: 0, message: 'Sheet is empty' })
    return { teams, issues }
  }

  const headers = (rows[0] as unknown[]).map(normalizeHeader)
  const regCol = findColumn(headers, ['reg_no', 'register_no', 'registration_no', 'regno', 'reg'])
  const nameCol = findColumn(headers, ['name', 'student_name', 'studentname'])
  const batchCodeCol = findColumn(headers, ['batch_id', 'batchid', 'batch_code', 'batchcode', 'team_code'])
  const snoCol = findColumn(headers, ['s_no', 'sno', 'sno', 'sl_no', 'slno', 'team_no', 'teamno'])

  if (regCol < 0 || nameCol < 0) {
    issues.push({ file: filePath, row: 1, message: `Could not find reg_no/name columns. Headers: ${headers.join(', ')}` })
    return { teams, issues }
  }

  let teamNo = 0
  let i = 1

  while (i < rows.length) {
    const row = rows[i] as unknown[]
    const regNo = String(row[regCol] ?? '').trim()
    const name = String(row[nameCol] ?? '').trim()

    if (!regNo && !name) {
      i++
      continue
    }

    if (!regNo || !name) {
      issues.push({ file: filePath, row: i + 1, message: `Incomplete row: reg="${regNo}" name="${name}"` })
      i++
      continue
    }

    teamNo++
    const batchCode = batchCodeCol >= 0 ? String(row[batchCodeCol] ?? '').trim() : `${batchId}${String(teamNo).padStart(2, '0')}`
    const inlineSupervisor = row.length > 4 ? String(row[4] ?? '').trim() || null : null
    const members: ParsedMember[] = [{ reg_no: regNo, name }]

    // Second member row
    i++
    if (i < rows.length) {
      const row2 = rows[i] as unknown[]
      const reg2 = String(row2[regCol] ?? '').trim()
      const name2 = String(row2[nameCol] ?? '').trim()
      if (reg2 && name2) {
        members.push({ reg_no: reg2, name: name2 })
        i++
      }
    }

    // Skip blank separator row
    if (i < rows.length) {
      const sep = rows[i] as unknown[]
      const isBlank = sep.every((c) => !String(c ?? '').trim())
      if (isBlank) i++
    }

    teams.push({
      batch_id: batchId,
      team_no: snoCol >= 0 ? Number(row[snoCol]) || teamNo : teamNo,
      batch_code: batchCode || `27${batchId}${String(teamNo).padStart(2, '0')}`,
      members,
      supervisor_name: inlineSupervisor,
    })
  }

  return { teams, issues }
}

function parseSupervisors(filePath: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!fs.existsSync(filePath)) return map

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][]

  for (const row of rows) {
    const batchCode = String(row[1] ?? '').trim()
    const supervisor = String(row[4] ?? '').trim()
    if (batchCode && supervisor) map.set(batchCode, supervisor)
  }

  return map
}

function parseProjects(filePath: string): { s_no: number | null; domain: string | null; title: string; abstract: string | null }[] {
  if (!fs.existsSync(filePath)) return []

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][]
  const projects: { s_no: number | null; domain: string | null; title: string; abstract: string | null }[] = []

  let startRow = 0
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i] as unknown[]
    const joined = row.map((c) => String(c).toLowerCase()).join(' ')
    if (joined.includes('domain') && joined.includes('title')) {
      startRow = i + 1
      break
    }
  }
  if (startRow === 0) startRow = 2

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const title = String(row[2] ?? '').trim()
    if (!title) continue

    projects.push({
      s_no: Number(row[0]) || null,
      domain: String(row[1] ?? '').trim() || null,
      title,
      abstract: String(row[3] ?? '').trim() || null,
    })
  }

  return projects
}

function supervisorToEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
  return `${slug}@teacher.portal`
}

function regNoToEmail(regNo: string): string {
  return `${regNo.trim().toLowerCase()}@student.portal`
}

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password: string,
  metadata: { role: string; full_name: string; reg_no?: string; supervisor_name?: string },
): Promise<string | null> {
  const { data: existing } = await supabase.auth.admin.listUsers()
  const found = existing?.users?.find((u) => u.email === email)
  if (found) return found.id

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

  const userId = data.user.id

  await supabase.from('profiles').upsert({
    id: userId,
    role: metadata.role,
    full_name: metadata.full_name,
    reg_no: metadata.reg_no ?? null,
    supervisor_name: metadata.supervisor_name ?? null,
  })

  return userId
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!dryRun && (!SUPABASE_URL || !SERVICE_ROLE_KEY)) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    console.error('Tip: run with --dry-run to validate Excel parsing without Supabase')
    process.exit(1)
  }

  const supabase = dryRun
    ? null
    : createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

  console.log('=== Project Allotment Portal — Data Import ===\n')
  if (dryRun) console.log('(dry-run mode — no database writes)\n')

  // Parse all batch files
  const allTeams: ParsedTeam[] = []
  const allIssues: ParseIssue[] = []

  for (const [batchId, filenames] of Object.entries(BATCH_FILES)) {
    const filePath = resolveDataFile(filenames)
    const filename = path.basename(filePath)
    console.log(`Parsing ${filename}…`)
    const { teams, issues } = parseBatchFile(filePath, batchId)
    allTeams.push(...teams)
    allIssues.push(...issues)
    console.log(`  → ${teams.length} teams`)
  }

  // Supervisors
  const supervisorsPath = resolveDataFile(SUPERVISORS_FILE)
  const supervisors = parseSupervisors(supervisorsPath)
  console.log(`\nSupervisor mappings (${path.basename(supervisorsPath)}): ${supervisors.size}`)

  // Projects
  const projectsPath = resolveDataFile(PROJECTS_FILE)
  const projects = parseProjects(projectsPath)
  console.log(`Projects parsed (${path.basename(projectsPath)}): ${projects.length}`)

  const teamsWithSupervisor = allTeams.filter(
    (t) => t.supervisor_name ?? supervisors.get(t.batch_code),
  ).length
  console.log(`Teams with supervisor assigned: ${teamsWithSupervisor}/${allTeams.length}`)

  if (dryRun) {
    console.log('\n=== Dry Run Summary ===')
    console.log(`Teams:    ${allTeams.length}`)
    console.log(`Members:  ${allTeams.reduce((n, t) => n + t.members.length, 0)}`)
    console.log(`Projects: ${projects.length}`)
    console.log(`Issues:   ${allIssues.length}`)
    if (allIssues.length > 0) {
      console.log('\n--- Issues ---')
      for (const issue of allIssues.slice(0, 20)) {
        console.log(`  [${issue.file}:${issue.row}] ${issue.message}`)
      }
    }
    return
  }

  // Insert projects
  if (projects.length > 0) {
    const { error } = await supabase!.from('projects').insert(projects)
    if (error) console.error('Projects insert error:', error.message)
    else console.log(`Inserted ${projects.length} projects`)
  }

  // Insert teams and members
  let teamsCreated = 0
  let membersCreated = 0
  const teacherNames = new Set<string>()

  for (const team of allTeams) {
    const supervisor = team.supervisor_name ?? supervisors.get(team.batch_code) ?? null
    if (supervisor) teacherNames.add(supervisor)

    const { data: teamRow, error: teamError } = await supabase!
      .from('teams')
      .insert({
        batch_id: team.batch_id,
        team_no: team.team_no,
        batch_code: team.batch_code,
        supervisor_name: supervisor,
      })
      .select('id')
      .single()

    if (teamError) {
      allIssues.push({ file: 'teams', row: team.team_no, message: teamError.message })
      continue
    }

    teamsCreated++

    for (const member of team.members) {
      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: teamRow.id,
        reg_no: member.reg_no,
        name: member.name,
      })

      if (memberError) {
        allIssues.push({ file: 'team_members', row: 0, message: `${member.reg_no}: ${memberError.message}` })
      } else {
        membersCreated++
      }
    }
  }

  console.log(`\nTeams created: ${teamsCreated}`)
  console.log(`Members created: ${membersCreated}`)

  // Create admin user
  console.log('\nCreating auth accounts…')
  const adminId = await ensureUser(supabase!, 'admin@portal.local', DEFAULT_PASSWORD, {
    role: 'admin',
    full_name: 'Portal Admin',
  })
  console.log(adminId ? '  Admin: admin@portal.local' : '  Admin: FAILED')

  // Create teacher accounts
  for (const name of teacherNames) {
    const email = supervisorToEmail(name)
    await ensureUser(supabase!, email, DEFAULT_PASSWORD, {
      role: 'teacher',
      full_name: name,
      supervisor_name: name,
    })
  }
  console.log(`  Teachers: ${teacherNames.size} accounts`)

  // Create student accounts and link to team_members
  const { data: allMembers } = await supabase!.from('team_members').select('id, reg_no, name')
  let studentsLinked = 0

  for (const member of allMembers ?? []) {
    const email = regNoToEmail(member.reg_no)
    const userId = await ensureUser(supabase!, email, member.reg_no, {
      role: 'student',
      full_name: member.name,
      reg_no: member.reg_no,
    })

    if (userId) {
      await supabase!.from('team_members').update({ user_id: userId }).eq('id', member.id)
      studentsLinked++
    }
  }
  console.log(`  Students: ${studentsLinked} accounts linked`)

  // Summary
  console.log('\n=== Import Summary ===')
  console.log(`Teams:   ${teamsCreated}`)
  console.log(`Members: ${membersCreated}`)
  console.log(`Projects: ${projects.length}`)
  console.log(`Issues:  ${allIssues.length}`)

  if (allIssues.length > 0) {
    console.log('\n--- Issues for manual review ---')
    for (const issue of allIssues.slice(0, 50)) {
      console.log(`  [${issue.file}:${issue.row}] ${issue.message}`)
    }
    if (allIssues.length > 50) console.log(`  … and ${allIssues.length - 50} more`)
  }

  console.log(`\nDefault password for admin/teachers: ${DEFAULT_PASSWORD}`)
  console.log('Admin login: admin@portal.local')
  console.log('Student login: Reg.No. (password is the same Reg.No.)')
  console.log('Teacher login: use email derived from supervisor name')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
