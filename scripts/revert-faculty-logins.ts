/**
 * Revert Chandramohan email and restore Dr.K.L. Shunmuganathan
 * (remove Mr.S.Swamynathan login + supervisor/reviewer slots).
 *
 * Usage: npx tsx scripts/revert-faculty-logins.ts
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEFAULT_PASSWORD = process.env.TEACHER_DEFAULT_PASSWORD ?? 'Portal@2026'

const CHANDRAMOHAN = {
  id: 'f008bf4d-9576-4dec-af00-f35774589875',
  name: 'Dr.S.Chandramohan',
  fromEmail: 'chandramohan.s@rajalakshmi.edu.in',
  toEmail: 'chandramohan.p@rajalakshmi.edu.in',
}

const SHUNMUGANATHAN = {
  id: 'f9d99e04-60cc-4b40-a799-6d652812030d',
  fromName: 'Mr.S.Swamynathan',
  fromEmail: 'swamynathan.s@rajalakshmi.edu.in',
  toName: 'Dr.K.L. Shunmuganathan',
  toEmail: 'dean.it@rajalakshmi.edu.in',
  designation: 'Professor & Dean',
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: chandraErr } = await supabase.auth.admin.updateUserById(CHANDRAMOHAN.id, {
    email: CHANDRAMOHAN.toEmail,
    email_confirm: true,
    user_metadata: { full_name: CHANDRAMOHAN.name },
  })
  if (chandraErr) throw chandraErr
  console.log(`Chandramohan login: ${CHANDRAMOHAN.fromEmail} → ${CHANDRAMOHAN.toEmail}`)

  const { data: teamsSup, error: teamsSupErr } = await supabase
    .from('teams')
    .select('id, batch_code')
    .eq('supervisor_name', SHUNMUGANATHAN.fromName)
  if (teamsSupErr) throw teamsSupErr

  for (const t of teamsSup ?? []) {
    const { error } = await supabase
      .from('teams')
      .update({ supervisor_name: SHUNMUGANATHAN.toName })
      .eq('id', t.id)
    if (error) throw error
    console.log(`  Supervisor slot ${t.batch_code} → ${SHUNMUGANATHAN.toName}`)
  }

  const { data: teamsRev, error: teamsRevErr } = await supabase
    .from('teams')
    .select('id, batch_code')
    .eq('reviewer_name', SHUNMUGANATHAN.fromName)
  if (teamsRevErr) throw teamsRevErr

  for (const t of teamsRev ?? []) {
    const { error } = await supabase
      .from('teams')
      .update({ reviewer_name: SHUNMUGANATHAN.toName })
      .eq('id', t.id)
    if (error) throw error
    console.log(`  Reviewer slot ${t.batch_code} → ${SHUNMUGANATHAN.toName}`)
  }

  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: SHUNMUGANATHAN.id,
    role: 'teacher',
    full_name: SHUNMUGANATHAN.toName,
    supervisor_name: SHUNMUGANATHAN.toName,
    reg_no: null,
  })
  if (profileErr) throw profileErr

  const { error: shunErr } = await supabase.auth.admin.updateUserById(SHUNMUGANATHAN.id, {
    email: SHUNMUGANATHAN.toEmail,
    email_confirm: true,
    user_metadata: { full_name: SHUNMUGANATHAN.toName },
  })
  if (shunErr) throw shunErr
  console.log(`Removed Swamynathan login; restored ${SHUNMUGANATHAN.toEmail}`)

  const csvPath = path.resolve(process.cwd(), 'data/supervisor-teacher-logins.csv')
  if (fs.existsSync(csvPath)) {
    let csv = fs.readFileSync(csvPath, 'utf8')
    csv = csv.replaceAll(CHANDRAMOHAN.fromEmail, CHANDRAMOHAN.toEmail)
    csv = csv.replaceAll(
      `"${SHUNMUGANATHAN.fromName}","${SHUNMUGANATHAN.fromEmail}"`,
      `"${SHUNMUGANATHAN.toName}","${SHUNMUGANATHAN.toEmail}"`,
    )
    fs.writeFileSync(csvPath, csv, 'utf8')
    console.log('Updated data/supervisor-teacher-logins.csv')
  }

  const namelistPath = path.resolve(process.cwd(), 'data/Faculty Namelist.xlsx')
  if (fs.existsSync(namelistPath)) {
    const wb = XLSX.readFile(namelistPath)
    const sheetName = wb.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName], { defval: '' })
    for (const row of rows) {
      const name = String(row.Name ?? row.name ?? '').trim()
      const email = String(row.Mail_id ?? row.mail_id ?? row.Email ?? '').trim().toLowerCase()
      if (name === CHANDRAMOHAN.name || email === CHANDRAMOHAN.fromEmail) {
        if (row.Mail_id !== undefined) row.Mail_id = CHANDRAMOHAN.toEmail
        else if (row.mail_id !== undefined) row.mail_id = CHANDRAMOHAN.toEmail
        else row.Email = CHANDRAMOHAN.toEmail
      }
      if (name === SHUNMUGANATHAN.fromName || email === SHUNMUGANATHAN.fromEmail) {
        if (row.Name !== undefined) row.Name = SHUNMUGANATHAN.toName
        else row.name = SHUNMUGANATHAN.toName
        if (row.Mail_id !== undefined) row.Mail_id = SHUNMUGANATHAN.toEmail
        else if (row.mail_id !== undefined) row.mail_id = SHUNMUGANATHAN.toEmail
        else row.Email = SHUNMUGANATHAN.toEmail
        if (row.Designation !== undefined) row.Designation = SHUNMUGANATHAN.designation
        else if (row.designation !== undefined) row.designation = SHUNMUGANATHAN.designation
      }
    }
    wb.Sheets[sheetName] = XLSX.utils.json_to_sheet(rows)
    XLSX.writeFile(wb, namelistPath)
    console.log('Updated data/Faculty Namelist.xlsx')
  }

  console.log('\nDone.')
  console.log(`Chandramohan: ${CHANDRAMOHAN.toEmail} / ${DEFAULT_PASSWORD}`)
  console.log(`Shunmuganathan: ${SHUNMUGANATHAN.toEmail} / ${DEFAULT_PASSWORD}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
