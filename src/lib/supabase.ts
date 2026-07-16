import { createClient } from '@supabase/supabase-js'

/** Vercel/env paste mistakes often duplicate the JWT or add newlines — keep the first valid token. */
function extractSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const first = value.trim().split(/\s+/)[0]
  return first || undefined
}

function extractAnonKey(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().split(/\s+/)[0]
  const jwtMatch = trimmed.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
  if (jwtMatch?.[0]) return jwtMatch[0]
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed
  return undefined
}

const supabaseUrl = extractSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = extractAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY)

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const configuredUrl = isValidSupabaseUrl(supabaseUrl) ? supabaseUrl : null
const configuredKey =
  supabaseAnonKey && supabaseAnonKey.length > 20 ? supabaseAnonKey : null

export const isSupabaseConfigured = Boolean(configuredUrl && configuredKey)

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Supabase is not configured. On Vercel, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (paste the anon key once, no extra lines), then redeploy.'

if (!isSupabaseConfigured) {
  console.error(supabaseConfigError)
} else {
  console.log('Supabase configured:', {
    url: configuredUrl,
    hasKey: !!configuredKey,
    keyLength: configuredKey?.length
  })
}

export const supabase = createClient(
  configuredUrl ?? 'https://placeholder.supabase.co',
  configuredKey ?? 'placeholder-anon-key',
)

export const STUDENT_EMAIL_DOMAIN = '@student.portal'
export const FACULTY_EMAIL_DOMAIN = '@rajalakshmi.edu.in'

const LEGACY_SUPERVISOR_DOMAIN = '@teacher.portal'

/** Lead coordinator — separate from per-supervisor faculty accounts. */
export const LEAD_TEACHER_EMAIL = 'baburathinam@rec.edu'

export function regNoToEmail(regNo: string): string {
  return `${regNo.trim().toLowerCase()}${STUDENT_EMAIL_DOMAIN}`
}

/** Student auth: email derived from Reg.No.; password is the Reg.No. itself. */
export function studentAuthCredentials(regNo: string): { email: string; password: string } {
  const normalized = regNo.trim()
  return {
    email: regNoToEmail(normalized),
    password: normalized,
  }
}

export function normalizeTeamCode(teamCode: string): string {
  return teamCode.trim().toUpperCase()
}

export function resolveLoginEmail(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  return regNoToEmail(trimmed)
}

/** Coordinator login (e.g. baburathinam@rec.edu) — not faculty supervisor accounts. */
export function resolveCoordinatorLoginEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase()
  if (!trimmed.includes('@')) {
    throw new Error('Enter your full coordinator email (e.g. baburathinam@rec.edu)')
  }
  if (trimmed.endsWith(LEGACY_SUPERVISOR_DOMAIN)) {
    throw new Error('Supervisor accounts use @rajalakshmi.edu.in — sign in on the Supervisor tab')
  }
  if (trimmed.endsWith(FACULTY_EMAIL_DOMAIN)) {
    throw new Error('Faculty supervisors sign in on the Supervisor tab')
  }
  return trimmed
}

function normalizeFacultyEmail(email: string): string {
  let normalized = email.trim().toLowerCase()
  if (normalized.endsWith('@rajalakshmi.edu') && !normalized.endsWith(FACULTY_EMAIL_DOMAIN)) {
    normalized += '.in'
  }
  return normalized
}

/** Supervisor login — faculty @rajalakshmi.edu.in email only. */
export function resolveSupervisorLoginEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase()
  if (!trimmed.includes('@')) {
    throw new Error('Enter your full supervisor email (e.g. muthukumar.b@rajalakshmi.edu.in)')
  }

  const email = normalizeFacultyEmail(trimmed)

  if (email.endsWith(LEGACY_SUPERVISOR_DOMAIN)) {
    throw new Error('@teacher.portal logins are no longer supported. Use your @rajalakshmi.edu.in email.')
  }

  if (email === LEAD_TEACHER_EMAIL || email.endsWith('@rec.edu')) {
    throw new Error('Coordinator accounts sign in on the Coordinator tab')
  }

  if (!email.endsWith(FACULTY_EMAIL_DOMAIN)) {
    throw new Error(`Supervisor email must be a faculty address (${FACULTY_EMAIL_DOMAIN})`)
  }

  return email
}
