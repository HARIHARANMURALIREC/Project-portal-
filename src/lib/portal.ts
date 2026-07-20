import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function fetchPortalOpen(): Promise<boolean> {
  if (!isSupabaseConfigured) return true

  const { data, error } = await supabase.rpc('get_portal_status')
  if (error) {
    const offline =
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('Load failed')
    if (!offline) {
      console.warn('Failed to fetch portal status:', error.message)
    }
    return true
  }
  const row = data?.[0] as { portal_open: boolean } | undefined
  return row?.portal_open ?? true
}
