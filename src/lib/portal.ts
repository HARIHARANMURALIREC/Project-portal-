import { supabase } from '@/lib/supabase'

export async function fetchPortalOpen(): Promise<boolean> {
  const { data, error } = await supabase.rpc('get_portal_status')
  if (error) {
    console.error('Failed to fetch portal status:', error)
    return true
  }
  const row = data?.[0] as { portal_open: boolean } | undefined
  return row?.portal_open ?? true
}
