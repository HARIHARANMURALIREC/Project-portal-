import { supabase } from '@/lib/supabase'

/** Fire-and-forget: notify teammates by email after a successful project selection. */
export function notifySelectionEmail(teamId: string): void {
  void (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('Selection email notification failed: not signed in')
        return
      }

      const response = await fetch('/api/send-selection-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ team_id: teamId }),
      })

      if (!response.ok) {
        const text = await response.text()
        console.warn('Selection email notification failed:', text || response.statusText)
      }
    } catch (err) {
      console.warn('Selection email notification failed:', err)
    }
  })()
}
