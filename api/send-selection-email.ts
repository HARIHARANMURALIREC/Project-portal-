import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { processSelectionEmailForTeam } from './lib/processSelectionEmail.js'
import { brevoConfigFromEnv } from './lib/selectionEmail.js'

function readTeamId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const teamId = (body as { team_id?: unknown }).team_id
  return typeof teamId === 'string' && teamId.trim() ? teamId.trim() : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      res.status(500).json({ error: 'Server is not configured' })
      return
    }

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const teamId = readTeamId(req.body)
    if (!teamId) {
      res.status(400).json({ error: 'team_id required' })
      return
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    const user = userData?.user
    if (userError || !user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { data: membership } = await userClient
      .from('team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      const { data: profile } = await userClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized' })
        return
      }
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const result = await processSelectionEmailForTeam(admin, teamId, brevoConfigFromEnv())

    if (!result.ok && result.results.length === 0) {
      res.status(500).json({ error: result.error ?? 'Failed to send email' })
      return
    }

    res.status(200).json({ ok: true, batch_code: result.batchCode, results: result.results })
  } catch (err) {
    console.error('send-selection-email failed:', err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    })
  }
}
