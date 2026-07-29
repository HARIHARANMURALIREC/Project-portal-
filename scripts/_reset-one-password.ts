import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const TARGET_EMAIL = 'pragadeesh@rajalakshmi.edu.in'
const NEW_PASSWORD = 'Portal@2026'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
if (listErr) {
  console.error('Failed to list users:', listErr.message)
  process.exit(1)
}

const user = list?.users?.find((u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase())
if (!user) {
  console.error(`User not found: ${TARGET_EMAIL}`)
  process.exit(1)
}

const { error } = await supabase.auth.admin.updateUserById(user.id, {
  password: NEW_PASSWORD,
  email_confirm: true,
})

if (error) {
  console.error('Failed to update password:', error.message)
  process.exit(1)
}

console.log(`Password updated successfully for ${user.email}`)
