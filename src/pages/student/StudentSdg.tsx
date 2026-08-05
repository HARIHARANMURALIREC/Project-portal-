import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe2, Plus, Trash2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useAuth } from '@/hooks/useAuth'
import {
  SDG_GOALS,
  createTeamSdgEntry,
  deleteTeamSdgEntry,
  fetchTeamSdgEntries,
  getSdgLabel,
} from '@/lib/sdg'
import type { StudentContext } from '@/types/student'

type DraftEntry = {
  id: string
  sdg: string
  description: string
}

function createDraft(): DraftEntry {
  return {
    id: crypto.randomUUID(),
    sdg: '',
    description: '',
  }
}

function SdgPageContent({ context }: { context: StudentContext }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const teamId = context.team.id
  const [drafts, setDrafts] = useState<DraftEntry[]>(() => [createDraft()])

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['team-sdg-entries', teamId],
    queryFn: () => fetchTeamSdgEntries(teamId),
  })

  const submitMutation = useMutation({
    mutationFn: async (draft: DraftEntry) => {
      if (!user?.id) throw new Error('Not signed in')
      if (!draft.description.trim()) throw new Error('Description is required')
      return createTeamSdgEntry({
        teamId,
        sdgGoal: draft.sdg,
        description: draft.description,
        userId: user.id,
      })
    },
    onSuccess: (_data, draft) => {
      toast.success(`SDG submitted (${getSdgLabel(draft.sdg)})`)
      setDrafts((prev) => {
        const next = prev.filter((d) => d.id !== draft.id)
        return next.length > 0 ? next : [createDraft()]
      })
      void queryClient.invalidateQueries({ queryKey: ['team-sdg-entries', teamId] })
      void queryClient.invalidateQueries({ queryKey: ['all-team-sdg-entries'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Submit failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeamSdgEntry(id),
    onSuccess: () => {
      toast.success('SDG entry removed')
      void queryClient.invalidateQueries({ queryKey: ['team-sdg-entries', teamId] })
      void queryClient.invalidateQueries({ queryKey: ['all-team-sdg-entries'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
  })

  const updateDraft = (id: string, patch: Partial<Pick<DraftEntry, 'sdg' | 'description'>>) => {
    setDrafts((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  return (
    <div className="space-y-4">
      <Card padding="lg" className="border-emerald-100 dark:border-emerald-800">
        <div className="mb-4 flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">SDG Page</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Select an SDG for your project and describe how your work contributes to it. Use Add to
          include more SDG sections. Submitted entries are visible to your supervisor and coordinator.
        </p>
      </Card>

      {drafts.map((entry, index) => (
        <Card key={entry.id} padding="lg" className="border-emerald-100 dark:border-emerald-800">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              SDG Section {index + 1}
            </h4>
            {drafts.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDrafts((prev) =>
                    prev.length <= 1 ? prev : prev.filter((d) => d.id !== entry.id),
                  )
                }
                className="gap-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <Select
              label="Sustainable Development Goal"
              value={entry.sdg}
              onChange={(e) => updateDraft(entry.id, { sdg: e.target.value })}
              className="w-full px-3 py-2 text-sm"
            >
              <option value="">Select an SDG goal</option>
              {SDG_GOALS.map((goal) => (
                <option key={goal.value} value={goal.value}>
                  {goal.label}
                </option>
              ))}
            </Select>

            <div className="flex w-full flex-col gap-3">
              <div className="w-full">
                <label
                  htmlFor={`sdg-description-${entry.id}`}
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Description
                </label>
                <textarea
                  id={`sdg-description-${entry.id}`}
                  value={entry.description}
                  onChange={(e) => updateDraft(entry.id, { description: e.target.value })}
                  placeholder="Explain how your project maps to the selected SDG…"
                  className="h-36 w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-app-surface dark:text-slate-100 dark:focus:border-primary-400 md:h-40"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => submitMutation.mutate(entry)}
                  disabled={!entry.description.trim() || submitMutation.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <Button type="button" onClick={() => setDrafts((prev) => [...prev, createDraft()])} className="gap-2">
        <Plus className="h-4 w-4" />
        Add
      </Button>

      <Card padding="lg">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Submitted SDGs
        </h3>
        {isLoading ? (
          <TableSkeleton rows={3} />
        ) : submissions.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            No SDGs submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {submissions.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {getSdgLabel(item.sdg_goal)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (confirm('Delete this SDG entry?')) deleteMutation.mutate(item.id)
                    }}
                    className="gap-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export function StudentSdg() {
  return (
    <StudentPageShell title="SDG Page" activeNav="sdg">
      {(context) => <SdgPageContent context={context} />}
    </StudentPageShell>
  )
}
