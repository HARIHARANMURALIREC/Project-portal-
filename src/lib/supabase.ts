import { createClient } from '@supabase/supabase-js'

/** Vercel/env paste mistakes often duplicate the JWT or add newlines — keep the first valid token. */
function extractSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const first = value.trim().split(/\s+/)[0]
  return first || undefined
}

function extractAnonKey(value: string | undefined): string | undefined {
  if (!value) return undefined
  const match = value.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
  return match?.[0]
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
}

export const supabase = createClient(
  configuredUrl ?? 'https://placeholder.supabase.co',
  configuredKey ?? 'placeholder-anon-key',
)

export const STUDENT_EMAIL_DOMAIN = '@student.portal'
export const TEACHER_EMAIL_DOMAIN = '@teacher.portal'

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
