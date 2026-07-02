/**
 * Apply a SQL migration file using direct Postgres connection.
 * Requires DATABASE_URL in .env
 *
 * Usage:
 *   npm run apply-migration -- 0011_team_member_email.sql
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
const fileArg = process.argv[2] ?? '0011_team_member_email.sql'

async function main() {
  if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env')
    console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)')
    console.error(`\nOr paste supabase/migrations/${fileArg} into the SQL Editor and run it.`)
    process.exit(1)
  }

  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations', fileArg)
  if (!fs.existsSync(sqlPath)) {
    console.error(`Migration not found: ${sqlPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8')
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  await client.query(sql)
  await client.end()
  console.log(`Applied ${fileArg} successfully.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
