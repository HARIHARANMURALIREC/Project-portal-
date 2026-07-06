/**
 * Sync supervisor_name on teams from the project allocation report Excel.
 *
 * Usage:
 *   npm run sync-supervisors
 *   npm run sync-supervisors:dry-run
 *   npm run sync-supervisors -- "data/your-report.xlsx"
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEFAULT_REPORT = path.resolve(
  process.cwd(),
  'data/project_selection_report-2026-07-03 with Supervisor Allotment.xlsx',
)

function normalizeTeamCode(code: string): string {
  return code.trim().toUpperCase()
}

function parseSupervisorReport(filePath: string): Map<string, string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Report file not found: ${filePath}`)
  }

  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames.find((n) => /allocation|project/i.test(n)) ?? wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
  }) as unknown[][]

  const map = new Map<string, string>()
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const teamId = normalizeTeamCode(String(row[0] ?? ''))
    const supervisor = String(row[5] ?? '').trim()
    if (!teamId || !/^27[A-D]\d{2}$/.test(teamId)) continue
    if (!supervisor) {
      console.warn(`  Row ${i + 1}: ${teamId} has no supervisor — skipped`)
      continue
    }
    map.set(teamId, supervisor)
  }

  return map
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const fileArg = process.argv.find((a) => a.endsWith('.xlsx'))
  const reportPath = fileArg ? path.resolve(process.cwd(), fileArg) : DEFAULT_REPORT

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supervisors = parseSupervisorReport(reportPath)
  console.log(`Parsed ${supervisors.size} team supervisors from ${path.basename(reportPath)}`)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, batch_code, supervisor_name')
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
    const next = supervisors.get(code)

    if (!next) {
      missingInReport += 1
      console.warn(`  No report row for ${code} (current: ${team.supervisor_name ?? '—'})`)
      continue
    }

    if (team.supervisor_name === next) {
      unchanged += 1
      continue
    }

    console.log(`  ${code}: ${team.supervisor_name ?? '—'} → ${next}`)
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('teams')
        .update({ supervisor_name: next })
        .eq('id', team.id)

      if (updateError) {
        console.error(`  Failed to update ${code}:`, updateError.message)
        process.exit(1)
      }
    }
    updated += 1
  }

  const reportOnly = [...supervisors.keys()].filter(
    (code) => !teams?.some((t) => normalizeTeamCode(t.batch_code) === code),
  )
  if (reportOnly.length > 0) {
    console.warn(`\n${reportOnly.length} team(s) in report but not in database:`, reportOnly.slice(0, 10).join(', '))
  }

  console.log(
    `\n${dryRun ? '[dry-run] ' : ''}Done: ${updated} updated, ${unchanged} unchanged, ${missingInReport} DB teams missing from report`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
