/**
 * Restore Zeroth Review marks for Aadithya B and Abishek S (demo delete recovery).
 *
 * Usage:
 *   npx tsx scripts/restore-zeroth-marks.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const RESTORES = [
  {
    name: 'Aadithya B',
    reg_no: '2116231001002',
    team_member_id: 'deb494e5-37cc-4761-97eb-a7f4611eeadf',
    team_id: '668b705a-daa3-4e8b-81ec-5bcf5f028f6d',
    team_review_id: '88040e24-414c-48a9-a241-6ec880ce6fe3',
    rows: [
      {
        role: 'supervisor',
        novelty_idea: 10,
        abstract_content: 4,
        sdg_goal_mapping: 10,
        marked_by: 'a1b27d88-36ed-47ae-8988-dc0bc653c0fc',
      },
      {
        role: 'reviewer',
        novelty_idea: 8,
        abstract_content: 5,
        sdg_goal_mapping: 8,
        marked_by: '7e76ebc8-0f86-4f35-bc4a-ef7d77fc2934',
      },
    ],
  },
  {
    name: 'Abishek S',
    reg_no: '2116231001006',
    team_member_id: 'ca79d274-118a-488c-bf26-35e9a0df7665',
    team_id: 'eec04a63-ebbb-4004-a7cd-8c72fcd08e68',
    team_review_id: '3ae36cf5-fe47-405e-aa26-8d5cf8d65525',
    rows: [
      {
        role: 'supervisor',
        novelty_idea: 8,
        abstract_content: 5,
        sdg_goal_mapping: 9,
        marked_by: '50066651-aaea-484d-a418-d3dd0c3e3813',
      },
      {
        role: 'reviewer',
        novelty_idea: 10,
        abstract_content: 4,
        sdg_goal_mapping: 10,
        marked_by: 'a1b27d88-36ed-47ae-8988-dc0bc653c0fc',
      },
    ],
  },
] as const

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  for (const student of RESTORES) {
    for (const row of student.rows) {
      const { data: existing } = await supabase
        .from('student_review_marks')
        .select('id')
        .eq('team_review_id', student.team_review_id)
        .eq('team_member_id', student.team_member_id)
        .eq('role', row.role)
        .maybeSingle()

      const payload = {
        team_review_id: student.team_review_id,
        team_id: student.team_id,
        team_member_id: student.team_member_id,
        role: row.role,
        novelty_idea: row.novelty_idea,
        abstract_content: row.abstract_content,
        sdg_goal_mapping: row.sdg_goal_mapping,
        marked_by: row.marked_by,
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        const { error } = await supabase.from('student_review_marks').update(payload).eq('id', existing.id)
        if (error) throw error
        console.log(`Updated ${student.name} (${row.role})`)
      } else {
        const { error } = await supabase.from('student_review_marks').insert(payload)
        if (error) throw error
        console.log(`Inserted ${student.name} (${row.role})`)
      }
    }
  }

  console.log('Done — Zeroth Review marks restored for Aadithya B and Abishek S.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
