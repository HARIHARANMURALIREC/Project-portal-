/**
 * Sync teams.reviewer_name from Supervisor and Reviewer Allotment.xlsx
 *
 * Usage:
 *   npm run sync-reviewers
 *   npm run sync-reviewers:dry-run
 *   npm run sync-reviewers -- "data/Supervisor and Reviewer Allotment.xlsx"
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import {
  buildFacultyLookup,
  lookupFacultyForSupervisor,
  parseFacultyNamelist,
} from './faculty-namelist'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEFAULT_REPORT = path.resolve(process.cwd(), 'data/Supervisor and Reviewer Allotment.xlsx')

function normalizeTeamCode(code: string): string {
  return code.trim().toUpperCase()
}

function parseReviewerAllotment(filePath: string): Map<string, string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Allotment file not found: ${filePath}`)
  }

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const map = new Map<string, string>()
  for (const row of rows) {
    const teamId = normalizeTeamCode(String(row['Team ID'] ?? row.TeamID ?? row.team_id ?? ''))
    const reviewer = String(row.Reviewer ?? row.reviewer ?? '').trim()
    if (!teamId || !/^27[A-D]\d{2}$/.test(teamId)) continue
    if (!reviewer) {
      console.warn(`  ${teamId}: no reviewer — skipped`)
      continue
    }
    map.set(teamId, reviewer)
  }

  return map
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const fileArg = process.argv.find((a) => a.endsWith('.xlsx') && !a.includes('Namelist'))
  const reportPath = fileArg ? path.resolve(process.cwd(), fileArg) : DEFAULT_REPORT

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const reviewers = parseReviewerAllotment(reportPath)
  console.log(`Parsed ${reviewers.size} team reviewers from ${path.basename(reportPath)}`)

  let lookup = new Map()
  try {
    lookup = buildFacultyLookup(parseFacultyNamelist())
    console.log(`Loaded faculty namelist for name normalization (${lookup.size} keys)`)
  } catch (err) {
    console.warn('Faculty namelist not loaded — using Excel names as-is:', err instanceof Error ? err.message : err)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, batch_code, reviewer_name')
    .order('batch_code')

  if (error) {
    console.error('Failed to load teams:', error.message)
    process.exit(1)
  }

  let updated = 0
  let unchanged = 0
  let missingInReport = 0

  for (const team of teams ?? []) {
    const code = normalizeTeamCode(team.batch_code)
    const raw = reviewers.get(code)
    if (!raw) {
      missingInReport += 1
      console.warn(`  No allotment row for ${code} (current: ${team.reviewer_name ?? '—'})`)
      continue
    }

    const faculty = lookup.size > 0 ? lookupFacultyForSupervisor(raw, lookup) : null
    const next = faculty?.name ?? raw

    if (team.reviewer_name === next) {
      unchanged += 1
      continue
    }

    console.log(`  ${code}: ${team.reviewer_name ?? '—'} → ${next}${faculty && faculty.name !== raw ? ` (from "${raw}")` : ''}`)
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('teams')
        .update({ reviewer_name: next })
        .eq('id', team.id)

      if (updateError) {
        console.error(`  Failed to update ${code}:`, updateError.message)
        process.exit(1)
      }
    }
    updated += 1
  }

  const reportOnly = [...reviewers.keys()].filter(
    (code) => !teams?.some((t) => normalizeTeamCode(t.batch_code) === code),
  )
  if (reportOnly.length > 0) {
    console.warn(`  In Excel but not in DB (${reportOnly.length}): ${reportOnly.slice(0, 10).join(', ')}${reportOnly.length > 10 ? '…' : ''}`)
  }

  console.log(
    `\n${dryRun ? '[dry-run] ' : ''}Done. updated=${updated} unchanged=${unchanged} missingInReport=${missingInReport}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
