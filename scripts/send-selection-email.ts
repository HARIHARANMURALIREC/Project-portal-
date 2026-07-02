/**
 * Send selection confirmation emails for a team (local testing / manual resend).
 *
 * Usage:
 *   npm run send-selection-email -- --team 27A01
 *   npm run send-selection-email -- --team 27A01 --dry-run
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import {
  brevoConfigFromEnv,
  sendSelectionEmailsForTeam,
  type SelectionEmailContext,
} from './lib/selectionEmail'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx < 0) return undefined
  return process.argv[idx + 1]
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const teamCode = getArg('--team')?.trim().toUpperCase()

  if (!teamCode) {
    console.error('Usage: npm run send-selection-email -- --team 27A01 [--dry-run]')
    process.exit(1)
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const brevo = brevoConfigFromEnv()
  if (!brevo && !dryRun) {
    console.error('Set BREVO_API_KEY and BREVO_SENDER_EMAIL in .env')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select(`
      id,
      batch_code,
      supervisor_name,
      locked_at,
      selected_project_id,
      team_members ( id, name, reg_no, email )
    `)
    .eq('batch_code', teamCode)
    .single()

  if (teamError || !team) {
    console.error(`Team ${teamCode} not found:`, teamError?.message ?? 'no row')
    process.exit(1)
  }

  if (!team.selected_project_id) {
    console.error(`Team ${teamCode} has no project selected yet.`)
    process.exit(1)
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('title, domain')
    .eq('id', team.selected_project_id)
    .single()

  if (projectError || !project?.title) {
    console.error(`Team ${teamCode} project details missing.`)
    process.exit(1)
  }

  const members = (team.team_members ?? []) as SelectionEmailContext['members']
  if (members.length === 0) {
    console.error(`Team ${teamCode} has no members.`)
    process.exit(1)
  }

  const ctx: SelectionEmailContext = {
    teamId: team.id,
    batchCode: team.batch_code,
    supervisorName: team.supervisor_name,
    lockedAt: team.locked_at,
    projectTitle: project.title,
    projectDomain: project.domain,
    members,
  }

  console.log(`\nTeam: ${ctx.batchCode}`)
  console.log(`Project: ${ctx.projectTitle}`)
  console.log(`Members: ${members.length}`)
  for (const m of members) {
    console.log(`  - ${m.name} <${m.email ?? 'NO EMAIL'}>`)
  }

  if (dryRun) {
    console.log('\nDry run — no emails sent.')
    return
  }

  const { data: existingLogs } = await supabase
    .from('selection_email_log')
    .select('member_id, status')
    .eq('team_id', team.id)
    .eq('status', 'sent')

  const alreadySent = new Set((existingLogs ?? []).map((l) => l.member_id))
  const pending = members.filter((m) => !alreadySent.has(m.id))
  if (pending.length === 0) {
    console.log('\nAll members already emailed for this team. Use --force to resend (not implemented).')
    return
  }

  console.log(`\nSending to ${pending.length} member(s)...`)
  const results = await sendSelectionEmailsForTeam(brevo!, { ...ctx, members: pending })

  for (const result of results) {
    const member = members.find((m) => m.id === result.memberId)
    const label = member?.name ?? result.memberId
    console.log(`  ${result.status.toUpperCase()} ${label} <${result.email}>${result.error ? ` — ${result.error}` : ''}`)

    await supabase.from('selection_email_log').upsert(
      {
        team_id: team.id,
        member_id: result.memberId,
        email: result.email || member?.email || '',
        status: result.status,
        error_message: result.error ?? null,
        sent_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,member_id' },
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
