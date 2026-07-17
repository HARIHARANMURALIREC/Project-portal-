import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarPlus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { supabase } from '@/lib/supabase'
import {
  fetchSupervisorInstructionsForTeam,
  upsertSupervisorInstruction,
  deleteSupervisorInstruction,
  formatSupervisorInstructionDateTime,
  toDatetimeLocalValue,
  getTeamIdFromBatchCode,
  type SupervisorInstruction,
} from '@/lib/supervisorNotes'

export function SupervisorInstructionScheduler() {
  const queryClient = useQueryClient()
  const [batchCode, setBatchCode] = useState('')
  const [instructionTitle, setInstructionTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState<SupervisorInstruction | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: instructions = [], isLoading } = useQuery({
    queryKey: ['supervisor-instructions', batchCode],
    queryFn: async () => {
      if (!batchCode.trim()) return []
      const teamId = await getTeamIdFromBatchCode(batchCode.trim())
      return fetchSupervisorInstructionsForTeam(teamId)
    },
    enabled: !!batchCode,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['supervisor-instructions'] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!batchCode.trim()) throw new Error('Enter a team batch code')
      if (!instructionTitle.trim()) throw new Error('Enter an instruction title')
      if (!scheduledAt) throw new Error('Select date and time')
      if (!notes.trim()) throw new Error('Enter instruction notes')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Not authenticated')
      return upsertSupervisorInstruction({
        supervisorId: user.id,
        batchCode: batchCode.trim(),
        instructionTitle: instructionTitle.trim(),
        scheduledAt,
        notes: notes.trim(),
      })
    },
    onSuccess: () => {
      toast.success('Instruction added for your team')
      setInstructionTitle('')
      setScheduledAt('')
      setNotes('')
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add instruction')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('No instruction selected')
      if (!editTitle.trim()) throw new Error('Enter an instruction title')
      if (!editScheduledAt) throw new Error('Select date and time')
      if (!editNotes.trim()) throw new Error('Enter instruction notes')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Not authenticated')
      return upsertSupervisorInstruction({
        supervisorId: user.id,
        batchCode: batchCode.trim(),
        instructionTitle: editTitle.trim(),
        scheduledAt: editScheduledAt,
        notes: editNotes.trim(),
      })
    },
    onSuccess: () => {
      toast.success('Instruction updated')
      setEditing(null)
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update instruction')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (instructionId: string) => deleteSupervisorInstruction(instructionId),
    onSuccess: () => {
      toast.success('Instruction deleted')
      if (editing) setEditing(null)
      invalidate()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete instruction')
    },
  })

  const startEdit = (instruction: SupervisorInstruction) => {
    setEditing(instruction)
    setEditTitle(instruction.instruction_title)
    setEditScheduledAt(toDatetimeLocalValue(instruction.scheduled_at))
    setEditNotes(instruction.notes)
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-violet-100 dark:border-violet-800">
        <div className="mb-4 flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add Team Instruction
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Instructions are visible only to the selected team members.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Team Batch Code</label>
          <Input
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            placeholder="Enter team batch code (e.g., 27A02, 27A07)"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Instruction title"
            value={instructionTitle}
            onChange={(e) => setInstructionTitle(e.target.value)}
            placeholder="e.g. Project meeting, Review preparation"
          />
          <Input
            label="Date & time"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detailed instructions for your team..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-app-surface dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        <Button
          className="mt-4"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Adding…' : 'Add Instruction'}
        </Button>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team Instructions</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Instructions you've added for your team members.
          </p>
        </div>

        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={4} />
          </div>
        ) : instructions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No instructions added yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {instructions.map((instruction) => {
              const expanded = expandedId === instruction.id
              return (
                <li key={instruction.id} className="px-5 py-4">
                  {editing?.id === instruction.id ? (
                    <div className="space-y-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{instruction.instruction_title}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          label="Instruction title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                        <Input
                          label="Date & time"
                          type="datetime-local"
                          value={editScheduledAt}
                          onChange={(e) => setEditScheduledAt(e.target.value)}
                        />
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-app-surface dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate()}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? 'Saving…' : 'Save'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : instruction.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {instruction.instruction_title}
                            </p>
                            {expanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {formatSupervisorInstructionDateTime(instruction.scheduled_at)}
                          </p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Click to view full instruction
                          </p>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(instruction)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (confirm(`Delete "${instruction.instruction_title}"?`)) {
                                deleteMutation.mutate(instruction.id)
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/50">
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {instruction.notes}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
