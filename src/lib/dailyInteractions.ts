import { supabase } from '@/lib/supabase'

export interface StudentDailyInteraction {
  id: string
  student_id: string
  team_id: string
  interaction_date: string
  notes: string
  created_at: string
  updated_at: string
}

export async function fetchStudentDailyInteractions(studentId: string): Promise<StudentDailyInteraction[]> {
  const { data, error } = await supabase
    .from('student_daily_interactions')
    .select('*')
    .eq('student_id', studentId)
    .order('interaction_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as StudentDailyInteraction[]
}

export async function upsertStudentInteraction(input: {
  studentId: string
  teamId: string
  interactionDate: string
  notes: string
}): Promise<StudentDailyInteraction> {
  const { data, error } = await supabase
    .from('student_daily_interactions')
    .upsert({
      student_id: input.studentId,
      team_id: input.teamId,
      interaction_date: input.interactionDate,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return data as StudentDailyInteraction
}

export async function deleteStudentInteraction(interactionId: string): Promise<void> {
  const { error } = await supabase
    .from('student_daily_interactions')
    .delete()
    .eq('id', interactionId)

  if (error) throw error
}
