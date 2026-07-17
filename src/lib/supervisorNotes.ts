import { supabase } from '@/lib/supabase'

export interface SupervisorInstruction {
  id: string
  supervisor_id: string
  team_id: string
  instruction_title: string
  scheduled_at: string
  notes: string
  created_at: string
  updated_at: string
}

export async function getTeamIdFromBatchCode(batchCode: string): Promise<string> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, batch_code')
    .ilike('batch_code', batchCode.trim())
    .limit(1)

  if (error) {
    throw new Error(`Error finding team: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(`Team with batch code "${batchCode}" not found. Please check the batch code and try again.`)
  }

  return data[0].id
}

export async function fetchSupervisorInstructionsForTeam(teamId: string): Promise<SupervisorInstruction[]> {
  const { data, error } = await supabase
    .from('supervisor_instructions')
    .select('*')
    .eq('team_id', teamId)
    .order('scheduled_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as SupervisorInstruction[]
}

export async function upsertSupervisorInstruction(input: {
  supervisorId: string
  batchCode: string
  instructionTitle: string
  scheduledAt: string
  notes: string
}): Promise<SupervisorInstruction> {
  const teamId = await getTeamIdFromBatchCode(input.batchCode)
  
  const { data, error } = await supabase
    .from('supervisor_instructions')
    .upsert({
      supervisor_id: input.supervisorId,
      team_id: teamId,
      instruction_title: input.instructionTitle,
      scheduled_at: input.scheduledAt,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return data as SupervisorInstruction
}

export async function deleteSupervisorInstruction(instructionId: string): Promise<void> {
  const { error } = await supabase
    .from('supervisor_instructions')
    .delete()
    .eq('id', instructionId)

  if (error) throw error
}

export function formatSupervisorInstructionDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toDatetimeLocalValue(dateString: string): string {
  const d = new Date(dateString)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
