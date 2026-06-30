import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export const isSupabaseConfigured =
  isValidSupabaseUrl(supabaseUrl) && Boolean(supabaseAnonKey && supabaseAnonKey.length > 20)

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Supabase is not configured. On Vercel, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY under Project → Settings → Environment Variables, then redeploy.'

if (!isSupabaseConfigured) {
  console.error(supabaseConfigError)
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey! : 'placeholder-anon-key',
)

export const STUDENT_EMAIL_DOMAIN = '@student.portal'
export const TEACHER_EMAIL_DOMAIN = '@teacher.portal'

export function regNoToEmail(regNo: string): string {
  return `${regNo.trim().toLowerCase()}${STUDENT_EMAIL_DOMAIN}`
}

export function resolveLoginEmail(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) return trimmed

  // Team codes (27A01) are not login IDs — students must use their Reg.No.
  if (/^27[A-D]\d{2}$/i.test(trimmed)) {
    throw new Error(
      '27A01 is a team code, not your login ID. Use your Reg.No. from the batch list (e.g. 2116231001001).',
    )
  }

  return regNoToEmail(trimmed)
}
