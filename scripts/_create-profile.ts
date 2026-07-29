import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const TARGET_EMAIL = 'pragadeesh@rajalakshmi.edu.in'
const FULL_NAME = 'Dr. S. Pragadeesh' // Update if needed
const SUPERVISOR_NAME = 'Dr. S. Pragadeesh' // Update if needed

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
  console.error(`Auth user not found: ${TARGET_EMAIL}`)
  console.error('Create the auth user first via Supabase dashboard: Authentication → Users → Add user')
  process.exit(1)
}

console.log(`Found auth user: ${user.email} (id: ${user.id})`)

// Check if profile already exists
const { data: existing } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .maybeSingle()

if (existing) {
  console.log('Profile already exists:', existing)
  console.log('Updating...')
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      role: 'teacher',
      full_name: FULL_NAME,
      supervisor_name: SUPERVISOR_NAME,
      reg_no: null,
    })
    .eq('id', user.id)
  
  if (updateErr) {
    console.error('Update failed:', updateErr.message)
    process.exit(1)
  }
  console.log('Profile updated successfully')
} else {
  console.log('Creating new profile...')
  const { error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      role: 'teacher',
      full_name: FULL_NAME,
      supervisor_name: SUPERVISOR_NAME,
      reg_no: null,
    })
  
  if (insertErr) {
    console.error('Insert failed:', insertErr.message)
    process.exit(1)
  }
  console.log('Profile created successfully')
}

console.log(`\n✓ ${TARGET_EMAIL} can now log in as a supervisor`)
console.log(`  Full name: ${FULL_NAME}`)
console.log(`  Supervisor name: ${SUPERVISOR_NAME}`)
