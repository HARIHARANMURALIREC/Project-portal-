import type { Connect } from 'vite'
import { createClient } from '@supabase/supabase-js'
import { processSelectionEmailForTeam } from './lib/processSelectionEmail.js'
import { brevoConfigFromEnv } from './lib/selectionEmail.js'

function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

export function createSelectionEmailDevMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url?.split('?')[0]
    if (url !== '/api/send-selection-email') {
      next()
      return
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 200
      res.end()
      return
    }

    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Server is not configured' }))
        return
      }

      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Unauthorized' }))
        return
      }

      const body = await readJsonBody(req)
      const teamId =
        body && typeof body === 'object' && typeof (body as { team_id?: unknown }).team_id === 'string'
          ? (body as { team_id: string }).team_id.trim()
          : ''

      if (!teamId) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'team_id required' }))
        return
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })

      const { data: userData, error: userError } = await userClient.auth.getUser()
      const user = userData?.user
      if (userError || !user) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Unauthorized' }))
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
          res.statusCode = 403
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Unauthorized' }))
          return
        }
      }

      const admin = createClient(supabaseUrl, serviceRoleKey)
      const result = await processSelectionEmailForTeam(admin, teamId, brevoConfigFromEnv())

      if (!result.ok && result.results.length === 0) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: result.error ?? 'Failed to send email' }))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, batch_code: result.batchCode, results: result.results }))
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Internal server error',
        }),
      )
    }
  }
}
