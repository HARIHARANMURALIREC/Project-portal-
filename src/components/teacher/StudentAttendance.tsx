import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Calendar, Check, X, User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  fetchAttendanceForTeam,
  markAttendance,
  deleteAttendance,
  formatAttendanceDate,
  getTodayDateString,
  type StudentAttendance,
} from '@/lib/attendance'
import { useAuth } from '@/hooks/useAuth'
import { sortTeamMembers } from '@/lib/teamSort'
import type { TeamWithDetails } from '@/types/database'

interface StudentAttendancePanelProps {
  team: TeamWithDetails
}

export function StudentAttendancePanel({ team }: StudentAttendancePanelProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(getTodayDateString())

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance', team.id, selectedDate],
    queryFn: () => fetchAttendanceForTeam(team.id, selectedDate),
  })

  const attendanceMap = new Map(attendance.map((a) => [a.student_id, a]))

  const markMutation = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: 'present' | 'absent' }) => {
      if (!user?.id) throw new Error('Not signed in')
      return markAttendance({
        studentId,
        teamId: team.id,
        date: selectedDate,
        status,
        markedBy: user.id,
      })
    },
    onSuccess: () => {
      toast.success('Attendance marked successfully')
      void queryClient.invalidateQueries({ queryKey: ['attendance', team.id, selectedDate] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to mark attendance')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      return deleteAttendance(attendanceId)
    },
    onSuccess: () => {
      toast.success('Attendance removed')
      void queryClient.invalidateQueries({ queryKey: ['attendance', team.id, selectedDate] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to remove attendance')
    },
  })

  const handleMarkAttendance = (studentId: string, status: 'present' | 'absent') => {
    markMutation.mutate({ studentId, status })
  }

  const handleRemoveAttendance = (studentId: string) => {
    const attendanceRecord = attendanceMap.get(studentId)
    if (attendanceRecord) {
      deleteMutation.mutate(attendanceRecord.id)
    }
  }

  const sortedMembers = team.team_members?.length
    ? sortTeamMembers(team.team_members)
    : []

  const presentCount = attendance.filter((a) => a.status === 'present').length
  const absentCount = attendance.filter((a) => a.status === 'absent').length
  const markedCount = attendance.length
  const totalStudents = sortedMembers.length

  return (
    <Card padding="lg" className="border-emerald-100 dark:border-emerald-800">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Student Attendance</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mark attendance for {team.batch_code}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <Input
          label="Select Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={getTodayDateString()}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/50">
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{presentCount}</span>
          <span className="text-sm text-emerald-700 dark:text-emerald-300">Present</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-950/50">
          <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{absentCount}</span>
          <span className="text-sm text-rose-700 dark:text-rose-300">Absent</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
          <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{markedCount}/{totalStudents}</span>
          <span className="text-sm text-slate-700 dark:text-slate-300">Marked</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : sortedMembers.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">No students in this team</p>
      ) : (
        <div className="space-y-2">
          {sortedMembers.map((member) => {
            const attendanceRecord = attendanceMap.get(member.id)
            const isMarked = attendanceRecord !== undefined

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50">
                    <User className="h-4 w-4 text-violet-700 dark:text-violet-300" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{member.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{member.reg_no}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isMarked ? (
                    <>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          attendanceRecord?.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {attendanceRecord?.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRemoveAttendance(member.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkAttendance(member.id, 'present')}
                        disabled={markMutation.isPending}
                        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkAttendance(member.id, 'absent')}
                        disabled={markMutation.isPending}
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Absent
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
