/**
 * Apply a SQL migration file using direct Postgres connection.
 * Requires DATABASE_URL in .env (from Supabase Dashboard → Settings → Database → URI)
 *
 * Usage: npm run apply-rls-fix
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL

async function main() {
  if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env')
    console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)')
    console.error('\nOr paste supabase/migrations/0002_fix_team_members_rls.sql into the SQL Editor and run it.')
    process.exit(1)
  }

  const sql = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/0002_fix_team_members_rls.sql'),
    'utf-8',
  )

  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  await client.query(sql)
  await client.end()
  console.log('RLS fix applied successfully.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
