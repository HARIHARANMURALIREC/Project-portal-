/**
 * Normalize duplicate/typo project domains in Supabase (safe — does not touch teams/selections).
 *
 * Usage:
 *   npm run normalize-domains -- --dry-run
 *   npm run normalize-domains
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { DOMAIN_ALIASES, normalizeDomain } from './domainNormalization'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: projects, error } = await supabase.from('projects').select('id, domain, title')
  if (error) {
    console.error('Failed to load projects:', error.message)
    process.exit(1)
  }

  const changes: { id: string; from: string; to: string; title: string }[] = []

  for (const p of projects ?? []) {
    if (!p.domain) continue
    const normalized = normalizeDomain(p.domain)
    if (normalized && normalized !== p.domain) {
      changes.push({ id: p.id, from: p.domain, to: normalized, title: p.title })
    }
  }

  const beforeUnique = new Set((projects ?? []).map((p) => p.domain).filter(Boolean)).size

  console.log('=== Domain normalization ===\n')
  console.log('Alias rules:')
  for (const [from, to] of Object.entries(DOMAIN_ALIASES)) {
    console.log(`  "${from}" → "${to}"`)
  }

  console.log(`\nProjects to update: ${changes.length}`)
  if (changes.length) {
    for (const c of changes) {
      console.log(`  "${c.from}" → "${c.to}"  (${c.title.slice(0, 50)}…)`)
    }
  }

  const afterDomains = new Set(
    (projects ?? []).map((p) => normalizeDomain(p.domain) ?? p.domain).filter(Boolean),
  )
  console.log(`\nUnique domains before: ${beforeUnique}`)
  console.log(`Unique domains after:  ${afterDomains.size}`)

  if (dryRun) {
    console.log('\n(dry-run — no database writes)')
    return
  }

  if (changes.length === 0) {
    console.log('\nNothing to update.')
    return
  }

  let updated = 0
  for (const c of changes) {
    const { error: updateError } = await supabase.from('projects').update({ domain: c.to }).eq('id', c.id)
    if (updateError) {
      console.error(`Failed ${c.id}:`, updateError.message)
    } else {
      updated++
    }
  }

  console.log(`\nUpdated ${updated} project(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
