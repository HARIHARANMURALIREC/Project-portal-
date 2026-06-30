import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { StatusBadge } from '@/components/StatusBadge'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { TeamWithDetails } from '@/types/database'

export function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [editingComments, setEditingComments] = useState<Record<string, string>>({})

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teacher-teams', profile?.supervisor_name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (id, reg_no, name),
          projects!teams_selected_project_id_fkey (id, title, domain, abstract),
          batches (id, name)
        `)
        .eq('supervisor_name', profile!.supervisor_name!)
        .order('batch_id')
        .order('team_no')
      if (error) throw error
      return data as TeamWithDetails[]
    },
    enabled: !!profile?.supervisor_name,
  })

  const saveComment = useMutation({
    mutationFn: async ({ teamId, comment }: { teamId: string; comment: string }) => {
      const { error } = await supabase
        .from('teams')
        .update({ teacher_comments: comment })
        .eq('id', teamId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Comment saved')
      queryClient.invalidateQueries({ queryKey: ['teacher-teams'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const selectedCount = teams.filter((t) => t.projects).length

  if (!profile?.supervisor_name) {
    return (
      <Layout title="Teacher Dashboard" userName={profile?.full_name ?? undefined} role="teacher" onSignOut={signOut}>
        <Card className="border-amber-200 bg-amber-50">
          <p className="font-semibold text-amber-900">Supervisor profile not configured</p>
          <p className="mt-1 text-sm text-amber-800">Contact your administrator to set your supervisor name.</p>
        </Card>
      </Layout>
    )
  }

  return (
    <Layout
      title="Teacher Dashboard"
      subtitle={`Supervising: ${profile.supervisor_name}`}
      userName={profile.full_name ?? undefined}
      role="teacher"
      onSignOut={signOut}
    >
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Card padding="sm" className="inline-flex items-center gap-2 border-violet-100 bg-white ring-1 ring-violet-50">
          <span className="text-2xl font-bold text-violet-700">{teams.length}</span>
          <span className="text-sm text-violet-600">teams total</span>
        </Card>
        <Card padding="sm" className="inline-flex items-center gap-2 border-emerald-100 bg-emerald-50">
          <span className="text-2xl font-bold text-emerald-700">{selectedCount}</span>
          <span className="text-sm text-emerald-600">projects selected</span>
        </Card>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : teams.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          No teams assigned to you yet.
        </Card>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <Card key={team.id} padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-violet-600 px-2.5 py-1 font-mono text-sm font-bold text-white">
                    {team.batch_code}
                  </span>
                  <span className="text-sm text-slate-500">{team.batches?.name}</span>
                </div>
                {team.projects ? (
                  <StatusBadge status="locked" label="Selected" />
                ) : (
                  <StatusBadge status="pending" />
                )}
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Members</h3>
                  <div className="flex flex-wrap gap-2">
                    {team.team_members?.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm ring-1 ring-slate-200"
                      >
                        {m.name} <span className="text-slate-400">({m.reg_no})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {team.projects ? (
                  <div className="rounded-lg bg-white p-4 ring-1 ring-slate-100">
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Selected Project
                    </h3>
                    <p className="font-semibold text-slate-900">{team.projects.title}</p>
                    {team.projects.domain && (
                      <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                        {team.projects.domain}
                      </span>
                    )}
                    {team.projects.abstract && (
                      <div className="mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                          className="!px-0 !text-violet-600"
                        >
                          {expandedTeam === team.id ? 'Hide abstract' : 'Show abstract'}
                        </Button>
                        {expandedTeam === team.id && (
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">{team.projects.abstract}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-500">No project selected yet</p>
                )}

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Your comment
                  </label>
                  <textarea
                    value={editingComments[team.id] ?? team.teacher_comments ?? ''}
                    onChange={(e) =>
                      setEditingComments((prev) => ({ ...prev, [team.id]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Add a note about this team…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      saveComment.mutate({
                        teamId: team.id,
                        comment: editingComments[team.id] ?? team.teacher_comments ?? '',
                      })
                    }
                    disabled={saveComment.isPending}
                  >
                    Save comment
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
