import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, FileText, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { fetchStudentDailyInteractions, upsertStudentInteraction, deleteStudentInteraction } from '@/lib/dailyInteractions'
import type { StudentContext } from '@/types/student'

function StudentDetailsContent({ context }: { context: StudentContext }) {
  const { team, members } = context
  const queryClient = useQueryClient()
  
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const currentStudent = members[0] // Assuming first member is the logged-in student

  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ['student-interactions', currentStudent?.id],
    queryFn: () => fetchStudentDailyInteractions(currentStudent?.id || ''),
    enabled: !!currentStudent?.id,
  })

  const upsertMutation = useMutation({
    mutationFn: () => upsertStudentInteraction({
      studentId: currentStudent?.id || '',
      teamId: team.id,
      interactionDate: selectedDate,
      notes: notes.trim(),
    }),
    onSuccess: () => {
      toast.success('Interaction saved successfully')
      setNotes('')
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['student-interactions'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save interaction')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (interactionId: string) => deleteStudentInteraction(interactionId),
    onSuccess: () => {
      toast.success('Interaction deleted')
      queryClient.invalidateQueries({ queryKey: ['student-interactions'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete interaction')
    },
  })

  const handleSave = () => {
    if (!notes.trim()) {
      toast.error('Please enter interaction notes')
      return
    }
    upsertMutation.mutate()
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    const existingInteraction = interactions.find(i => i.interaction_date === date)
    if (existingInteraction) {
      setNotes(existingInteraction.notes)
      setIsEditing(true)
    } else {
      setNotes('')
      setIsEditing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-violet-100 dark:border-violet-800">
        <div className="mb-6 flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Daily Interactions with Supervisor</h3>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {formatDate(selectedDate)}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Interaction Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe your interaction with the supervisor today..."
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-app-surface dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={upsertMutation.isPending || !notes.trim()}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isEditing ? 'Update' : 'Save'} Interaction
          </Button>
          {isEditing && (
            <Button
              variant="secondary"
              onClick={() => {
                setNotes('')
                setIsEditing(false)
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <Card padding="lg">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Interaction History</h3>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : interactions.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No interactions recorded yet</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Start by logging your first interaction above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(interaction.interaction_date)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(interaction.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm('Delete this interaction?')) {
                        deleteMutation.mutate(interaction.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {interaction.notes}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export function StudentDetails() {
  return (
    <StudentPageShell title="Daily Interactions" activeNav="details">
      {(context) => <StudentDetailsContent context={context} />}
    </StudentPageShell>
  )
}
