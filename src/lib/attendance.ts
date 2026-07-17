import { supabase } from '@/lib/supabase'

export interface StudentAttendance {
  id: string
  student_id: string
  team_id: string
  attendance_date: string
  status: 'present' | 'absent'
  marked_by: string
  created_at: string
  updated_at: string
}

export async function fetchAttendanceForTeam(
  teamId: string,
  date: string
): Promise<StudentAttendance[]> {
  const { data, error } = await supabase
    .from('student_attendance')
    .select('*')
    .eq('team_id', teamId)
    .eq('attendance_date', date)

  if (error) throw error
  return (data ?? []) as StudentAttendance[]
}

export async function fetchAttendanceForStudent(
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<StudentAttendance[]> {
  let query = supabase
    .from('student_attendance')
    .select('*')
    .eq('student_id', studentId)

  if (startDate) {
    query = query.gte('attendance_date', startDate)
  }
  if (endDate) {
    query = query.lte('attendance_date', endDate)
  }

  const { data, error } = await query.order('attendance_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as StudentAttendance[]
}

export async function markAttendance(input: {
  studentId: string
  teamId: string
  date: string
  status: 'present' | 'absent'
  markedBy: string
}): Promise<StudentAttendance> {
  const { data, error } = await supabase
    .from('student_attendance')
    .upsert({
      student_id: input.studentId,
      team_id: input.teamId,
      attendance_date: input.date,
      status: input.status,
      marked_by: input.markedBy,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as StudentAttendance
}

export async function deleteAttendance(attendanceId: string): Promise<void> {
  const { error } = await supabase
    .from('student_attendance')
    .delete()
    .eq('id', attendanceId)

  if (error) throw error
}

export function formatAttendanceDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}
