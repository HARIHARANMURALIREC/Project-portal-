export interface BrevoConfig {
  apiKey: string
  senderEmail: string
  senderName: string
}

export interface TeamMemberEmail {
  id: string
  name: string
  reg_no: string
  email: string | null
}

export interface SelectionEmailContext {
  teamId: string
  batchCode: string
  supervisorName: string | null
  lockedAt: string | null
  projectTitle: string
  projectDomain: string | null
  members: TeamMemberEmail[]
}

export interface SendMemberResult {
  memberId: string
  email: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
}

export function buildSelectionEmailHtml(ctx: SelectionEmailContext, member: TeamMemberEmail): string {
  const memberList = ctx.members
    .map((m) => `<li>${escapeHtml(m.name)} (${escapeHtml(m.reg_no)})</li>`)
    .join('')

  const lockedLabel = ctx.lockedAt
    ? new Date(ctx.lockedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : '—'

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; color: #0f172a;">
      <p>Dear ${escapeHtml(member.name)},</p>
      <p>Your team <strong>${escapeHtml(ctx.batchCode)}</strong> has been allotted the following final year project:</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Project</td><td><strong>${escapeHtml(ctx.projectTitle)}</strong></td></tr>
        ${ctx.projectDomain ? `<tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Domain</td><td>${escapeHtml(ctx.projectDomain)}</td></tr>` : ''}
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Selected on</td><td>${escapeHtml(lockedLabel)}</td></tr>
        ${ctx.supervisorName ? `<tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Supervisor</td><td>${escapeHtml(ctx.supervisorName)}</td></tr>` : ''}
      </table>
      <p><strong>Team members</strong></p>
      <ul>${memberList}</ul>
      <p style="margin-top: 20px; padding: 12px; background: #f5f3ff; border-radius: 8px;">
        This selection is final. Contact your coordinator if any detail is incorrect.
      </p>
      <p style="text-align: center; color: #64748b; font-size: 13px; margin-top: 24px; line-height: 1.6;">
        <strong>Project Allotment Portal</strong><br/>
        Rajalakshmi Engineering College<br/>
        Team OG
      </p>
    </div>
  `.trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendBrevoEmail(
  config: BrevoConfig,
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: config.senderEmail, name: config.senderName },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Brevo ${response.status}: ${body}`)
  }
}

export async function sendSelectionEmailsForTeam(
  config: BrevoConfig,
  ctx: SelectionEmailContext,
  options: { dryRun?: boolean; skipIfAlreadySent?: boolean } = {},
): Promise<SendMemberResult[]> {
  const results: SendMemberResult[] = []
  const subject = `Project Allotment Confirmation — Team ${ctx.batchCode}`

  for (const member of ctx.members) {
    if (!member.email) {
      results.push({
        memberId: member.id,
        email: '',
        status: 'skipped',
        error: 'No email on file',
      })
      continue
    }

    if (options.dryRun) {
      results.push({
        memberId: member.id,
        email: member.email,
        status: 'sent',
      })
      continue
    }

    try {
      const html = buildSelectionEmailHtml(ctx, member)
      await sendBrevoEmail(config, member.email, member.name, subject, html)
      results.push({
        memberId: member.id,
        email: member.email,
        status: 'sent',
      })
    } catch (err) {
      results.push({
        memberId: member.id,
        email: member.email,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return results
}

export function brevoConfigFromEnv(): BrevoConfig | null {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME ?? 'Project Allotment Portal - REC'
  if (!apiKey || !senderEmail) return null
  return { apiKey, senderEmail, senderName }
}
