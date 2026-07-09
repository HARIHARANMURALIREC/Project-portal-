import { supabase } from '@/lib/supabase'
import type { SupervisorLoginStatus } from '@/types/database'

export async function fetchSupervisorLoginStatus(): Promise<SupervisorLoginStatus[]> {
  const { data, error } = await supabase.rpc('admin_supervisor_login_status')
  if (error) throw error
  return (data ?? []) as SupervisorLoginStatus[]
}

export async function markSupervisorPasswordChanged(): Promise<void> {
  const { error } = await supabase.rpc('mark_supervisor_password_changed')
  if (error) throw error
}
