/**
 * Sync student college emails from Excel into team_members.email.
 *
 * Usage:
 *   npm run sync-emails
 *   npm run sync-emails -- --dry-run
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { parseEmailFile } from './parseEmailExcel'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATA_DIR = path.resolve(process.cwd(), 'data')

const EMAIL_FILES = [
  'IT-A-Email.xlsx',
  'IT-B-Email.xlsx',
  'IT-C-Email.xlsx',
  'IT-D-Email.xlsx',
  'IT-A-EmailID.xlsx',
  'IT-B-EmailID.xlsx',
  'IT-C-EmailID.xlsx',
  'IT-D-EmailID.xlsx',
]

function resolveEmailFiles(): string[] {
  const found: string[] = []
  for (const name of EMAIL_FILES) {
    const p = path.join(DATA_DIR, name)
    if (fs.existsSync(p) && !found.some((f) => path.basename(f) === name)) {
      found.push(p)
    }
  }
  return found
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const files = resolveEmailFiles()
  if (files.length === 0) {
    console.error('No email Excel files found in data/. Expected IT-A-Email.xlsx etc.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const allRows = []
  const allIssues = []

  for (const file of files) {
    const { rows, issues } = parseEmailFile(file)
    console.log(`\n${path.basename(file)}: ${rows.length} rows, ${issues.length} issues`)
    allRows.push(...rows)
    allIssues.push(...issues)
  }

  const byReg = new Map<string, (typeof allRows)[0]>()
  for (const row of allRows) {
    const existing = byReg.get(row.reg_no)
    if (existing && existing.email !== row.email) {
      allIssues.push({
        file: 'merge',
        row: 0,
        message: `Duplicate reg ${row.reg_no}: ${existing.email} vs ${row.email}`,
      })
    }
    byReg.set(row.reg_no, row)
  }

  console.log(`\nUnique students in Excel: ${byReg.size}`)

  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('id, reg_no, name, email')

  if (membersError) {
    console.error('Failed to load team_members:', membersError.message)
    console.error('\nRun migration 0011_team_member_email.sql in Supabase SQL Editor first.')
    process.exit(1)
  }

  const memberByReg = new Map((members ?? []).map((m) => [m.reg_no, m]))
  let updated = 0
  let notFound = 0
  let unchanged = 0

  for (const [reg_no, row] of byReg) {
    const member = memberByReg.get(reg_no)
    if (!member) {
      notFound++
      console.log(`  NOT IN DB: ${reg_no} ${row.name} <${row.email}>`)
      continue
    }

    if (member.email === row.email) {
      unchanged++
      continue
    }

    if (dryRun) {
      console.log(`  WOULD UPDATE ${reg_no}: ${member.email ?? '(none)'} → ${row.email}`)
      updated++
      continue
    }

    const { error } = await supabase
      .from('team_members')
      .update({ email: row.email })
      .eq('id', member.id)

    if (error) {
      allIssues.push({ file: 'db', row: 0, message: `${reg_no}: ${error.message}` })
    } else {
      updated++
    }
  }

  console.log('\n=== Sync Summary ===')
  console.log(`Updated:   ${updated}${dryRun ? ' (dry-run)' : ''}`)
  console.log(`Unchanged: ${unchanged}`)
  console.log(`Not in DB: ${notFound}`)
  console.log(`Issues:    ${allIssues.length}`)

  if (allIssues.length > 0) {
    console.log('\n--- Issues ---')
    for (const issue of allIssues.slice(0, 30)) {
      console.log(`  [${issue.file}:${issue.row}] ${issue.message}`)
    }
    if (allIssues.length > 30) console.log(`  … and ${allIssues.length - 30} more`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
