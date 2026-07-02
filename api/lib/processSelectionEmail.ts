import type { SupabaseClient } from '@supabase/supabase-js'
import {
  brevoConfigFromEnv,
  sendSelectionEmailsForTeam,
  type BrevoConfig,
  type SelectionEmailContext,
} from './selectionEmail.js'

export interface ProcessSelectionEmailResult {
  ok: boolean
  batchCode?: string
  results: Array<{
    member_id: string
    email: string
    status: string
    error?: string
  }>
  error?: string
}

export async function processSelectionEmailForTeam(
  admin: SupabaseClient,
  teamId: string,
  brevo: BrevoConfig | null = brevoConfigFromEnv(),
): Promise<ProcessSelectionEmailResult> {
  if (!brevo) {
    return { ok: false, results: [], error: 'Brevo is not configured' }
  }

  const { data: team, error: teamError } = await admin
    .from('teams')
    .select(`
      id,
      batch_code,
      supervisor_name,
      locked_at,
      selected_project_id,
      team_members ( id, name, reg_no, email )
    `)
    .eq('id', teamId)
    .single()

  if (teamError || !team?.selected_project_id) {
    return { ok: false, results: [], error: 'Team not found or no project selected' }
  }

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('title, domain')
    .eq('id', team.selected_project_id)
    .single()

  if (projectError || !project?.title) {
    return { ok: false, results: [], error: 'Project details missing' }
  }

  const members = (team.team_members ?? []) as SelectionEmailContext['members']
  if (members.length === 0) {
    return { ok: false, results: [], error: 'Team has no members' }
  }

  const { data: existingLogs } = await admin
    .from('selection_email_log')
    .select('member_id, status')
    .eq('team_id', teamId)
    .eq('status', 'sent')

  const alreadySent = new Set((existingLogs ?? []).map((l) => l.member_id))
  const pending = members.filter((m) => !alreadySent.has(m.id))

  if (pending.length === 0) {
    return {
      ok: true,
      batchCode: team.batch_code,
      results: members.map((m) => ({
        member_id: m.id,
        email: m.email ?? '',
        status: 'skipped',
        error: 'Already sent',
      })),
    }
  }

  const ctx: SelectionEmailContext = {
    teamId: team.id,
    batchCode: team.batch_code,
    supervisorName: team.supervisor_name,
    lockedAt: team.locked_at,
    projectTitle: project.title,
    projectDomain: project.domain,
    members: pending,
  }

  const sendResults = await sendSelectionEmailsForTeam(brevo, ctx)
  const results: ProcessSelectionEmailResult['results'] = []

  for (const result of sendResults) {
    const member = members.find((m) => m.id === result.memberId)
    results.push({
      member_id: result.memberId,
      email: result.email || member?.email || '',
      status: result.status,
      error: result.error,
    })

    await admin.from('selection_email_log').upsert(
      {
        team_id: teamId,
        member_id: result.memberId,
        email: result.email || member?.email || '',
        status: result.status,
        error_message: result.error ?? null,
        sent_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,member_id' },
    )
  }

  return {
    ok: sendResults.every((r) => r.status !== 'failed'),
    batchCode: team.batch_code,
    results,
  }
}
