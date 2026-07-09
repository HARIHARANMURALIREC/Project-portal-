/**
 * Assign projects to selection_blocked teams from the supervisor allotment report.
 * Creates missing project rows in Supabase when the report title is not in the pool yet.
 *
 * Usage:
 *   npm run assign-blocked-projects
 *   npm run assign-blocked-projects:dry-run
 *   npm run assign-blocked-projects -- "data/your-report.xlsx"
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { normalizeDomain } from './domainNormalization'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEFAULT_REPORT = path.resolve(
  process.cwd(),
  'data/project_selection_report-2026-07-03 with Supervisor Allotment.xlsx',
)

interface ReportRow {
  batchCode: string
  domain: string | null
  projectTitle: string
  supervisor: string | null
}

function normalizeTeamCode(code: string): string {
  return code.trim().toUpperCase()
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ')
}

function isValidProjectTitle(title: string): boolean {
  const normalized = normalizeTitle(title)
  if (!normalized) return false
  const description = normalized.replace(/^Title\s*\d+[A-Za-z]?\s*[-–—]\s*/i, '').trim()
  return description.length >= 3
}

function parseReport(filePath: string): Map<string, ReportRow> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Report file not found: ${filePath}`)
  }

  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames.find((n) => /allocation|project/i.test(n)) ?? wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
  }) as unknown[][]

  const map = new Map<string, ReportRow>()
  for (let i = 1; i < rows.length; i++) {
    const batchCode = normalizeTeamCode(String(rows[i][0] ?? ''))
    if (!batchCode || !/^27[A-D]\d{2}$/.test(batchCode)) continue

    map.set(batchCode, {
      batchCode,
      domain: normalizeDomain(String(rows[i][3] ?? '')),
      projectTitle: normalizeTitle(String(rows[i][4] ?? '')),
      supervisor: String(rows[i][5] ?? '').trim() || null,
    })
  }

  return map
}

async function findOrCreateProject(
  supabase: ReturnType<typeof createClient>,
  title: string,
  domain: string | null,
  dryRun: boolean,
): Promise<{ id: string; created: boolean } | null> {
  const normalized = normalizeTitle(title)
  if (!normalized) return null

  const { data: existing } = await supabase
    .from('projects')
    .select('id, title, status, locked_by_team_id')
    .ilike('title', normalized)

  const exact = existing?.find((p) => normalizeTitle(p.title).toLowerCase() === normalized.toLowerCase())
  if (exact) {
    return { id: exact.id, created: false }
  }

  if (dryRun) {
    console.log(`    [dry-run] Would create project: ${normalized.slice(0, 70)}`)
    return { id: 'dry-run', created: true }
  }

  const { data: maxRow } = await supabase
    .from('projects')
    .select('s_no')
    .order('s_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSNo = (maxRow?.s_no ?? 0) + 1

  const { data, error } = await supabase
    .from('projects')
    .insert({
      s_no: nextSNo,
      title: normalized,
      domain,
      abstract: null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error(`    Failed to create project: ${error?.message}`)
    return null
  }

  return { id: data.id, created: true }
}

async function assignProjectToTeam(
  supabase: ReturnType<typeof createClient>,
  teamId: string,
  projectId: string,
  dryRun: boolean,
): Promise<{ ok: boolean; message: string }> {
  if (dryRun) {
    return { ok: true, message: 'dry-run assign' }
  }

  const { data: team } = await supabase
    .from('teams')
    .select('selected_project_id')
    .eq('id', teamId)
    .single()

  if (team?.selected_project_id) {
    return { ok: false, message: 'Team already has a project assigned' }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('status, locked_by_team_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return { ok: false, message: 'Project not found' }
  }

  if (project.status === 'locked' && project.locked_by_team_id && project.locked_by_team_id !== teamId) {
    return { ok: false, message: 'Project is already locked by another team' }
  }

  if (project.status === 'open') {
    const { error: lockError } = await supabase
      .from('projects')
      .update({
        status: 'locked',
        locked_by_team_id: teamId,
        locked_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('status', 'open')

    if (lockError) {
      return { ok: false, message: lockError.message }
    }
  }

  const { error: teamError } = await supabase
    .from('teams')
    .update({
      selected_project_id: projectId,
      locked_by_user_id: null,
      locked_at: new Date().toISOString(),
    })
    .eq('id', teamId)
    .is('selected_project_id', null)

  if (teamError) {
    await supabase
      .from('projects')
      .update({ status: 'open', locked_by_team_id: null, locked_at: null })
      .eq('id', projectId)
      .eq('locked_by_team_id', teamId)
    return { ok: false, message: teamError.message }
  }

  return { ok: true, message: 'Assigned' }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const fileArg = process.argv.find((a) => a.endsWith('.xlsx'))
  const reportPath = fileArg ? path.resolve(process.cwd(), fileArg) : DEFAULT_REPORT

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const report = parseReport(reportPath)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: blockedTeams, error } = await supabase
    .from('teams')
    .select('id, batch_code, supervisor_name, selected_project_id, selection_blocked')
    .eq('selection_blocked', true)
    .order('batch_code')

  if (error) {
    console.error('Failed to load blocked teams:', error.message)
    process.exit(1)
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}Blocked teams: ${blockedTeams?.length ?? 0}`)
  console.log(`Report: ${path.basename(reportPath)}\n`)

  let assigned = 0
  let skipped = 0
  let failed = 0

  for (const team of blockedTeams ?? []) {
    const row = report.get(normalizeTeamCode(team.batch_code))
    console.log(`${team.batch_code} | supervisor: ${team.supervisor_name ?? row?.supervisor ?? '—'}`)

    if (team.selected_project_id) {
      console.log('  Skip: project already assigned in database')
      skipped++
      continue
    }

    if (!row?.projectTitle || !isValidProjectTitle(row.projectTitle)) {
      console.log('  Skip: no valid project title in report')
      skipped++
      continue
    }

    const projectRef = await findOrCreateProject(supabase, row.projectTitle, row.domain, dryRun)
    if (!projectRef) {
      console.log('  Failed: could not resolve project')
      failed++
      continue
    }

    if (projectRef.created) {
      console.log(`  Created project: ${row.projectTitle.slice(0, 70)}`)
    } else {
      console.log(`  Found project: ${row.projectTitle.slice(0, 70)}`)
    }

    const result = await assignProjectToTeam(supabase, team.id, projectRef.id, dryRun)
    if (result.ok) {
      console.log(`  ✓ ${result.message}`)
      assigned++
    } else {
      console.log(`  ✗ ${result.message}`)
      failed++
    }
  }

  console.log(`\n${dryRun ? '[dry-run] ' : ''}Done: ${assigned} assigned, ${skipped} skipped, ${failed} failed`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
