import { supabase } from '@/lib/supabase'

export const SDG_GOALS = [
  { value: '1', label: 'SDG 1 – No Poverty' },
  { value: '2', label: 'SDG 2 – Zero Hunger' },
  { value: '3', label: 'SDG 3 – Good Health and Well-being' },
  { value: '4', label: 'SDG 4 – Quality Education' },
  { value: '5', label: 'SDG 5 – Gender Equality' },
  { value: '6', label: 'SDG 6 – Clean Water and Sanitation' },
  { value: '7', label: 'SDG 7 – Affordable and Clean Energy' },
  { value: '8', label: 'SDG 8 – Decent Work and Economic Growth' },
  { value: '9', label: 'SDG 9 – Industry, Innovation and Infrastructure' },
  { value: '10', label: 'SDG 10 – Reduced Inequalities' },
  { value: '11', label: 'SDG 11 – Sustainable Cities and Communities' },
  { value: '12', label: 'SDG 12 – Responsible Consumption and Production' },
  { value: '13', label: 'SDG 13 – Climate Action' },
  { value: '14', label: 'SDG 14 – Life Below Water' },
  { value: '15', label: 'SDG 15 – Life on Land' },
  { value: '16', label: 'SDG 16 – Peace, Justice and Strong Institutions' },
  { value: '17', label: 'SDG 17 – Partnerships for the Goals' },
] as const

export type TeamSdgEntry = {
  id: string
  team_id: string
  sdg_goal: string
  description: string
  uploaded_by: string
  created_at: string
  updated_at: string
}

export function getSdgLabel(value: string): string {
  return SDG_GOALS.find((g) => g.value === value)?.label ?? (value ? `SDG ${value}` : 'Not selected')
}

export async function fetchTeamSdgEntries(teamId: string): Promise<TeamSdgEntry[]> {
  const { data, error } = await supabase
    .from('team_sdg_entries')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TeamSdgEntry[]
}

export async function fetchAllTeamSdgEntries(): Promise<TeamSdgEntry[]> {
  const { data, error } = await supabase
    .from('team_sdg_entries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TeamSdgEntry[]
}

export async function createTeamSdgEntry(input: {
  teamId: string
  sdgGoal: string
  description: string
  userId: string
}): Promise<TeamSdgEntry> {
  const { data, error } = await supabase
    .from('team_sdg_entries')
    .insert({
      team_id: input.teamId,
      sdg_goal: input.sdgGoal,
      description: input.description.trim(),
      uploaded_by: input.userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as TeamSdgEntry
}

export async function deleteTeamSdgEntry(id: string): Promise<void> {
  const { error } = await supabase.from('team_sdg_entries').delete().eq('id', id)
  if (error) throw error
}
