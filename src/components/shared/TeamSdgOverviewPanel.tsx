import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Globe2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { fetchAllTeamSdgEntries, getSdgLabel } from '@/lib/sdg'
import type { TeamWithDetails } from '@/types/database'

export function TeamSdgOverviewPanel({ teams }: { teams: TeamWithDetails[] }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['all-team-sdg-entries'],
    queryFn: fetchAllTeamSdgEntries,
  })

  const entriesByTeam = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const entry of entries) {
      const list = map.get(entry.team_id) ?? []
      list.push(entry)
      map.set(entry.team_id, list)
    }
    return map
  }, [entries])

  const teamsByBatch = useMemo(() => {
    const map = new Map<string, TeamWithDetails[]>()
    for (const team of teams) {
      const key = team.batches?.name ?? team.batch_id ?? 'Other'
      const list = map.get(key) ?? []
      list.push(team)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [teams])

  if (isLoading) return <TableSkeleton rows={8} />

  if (teams.length === 0) {
    return (
      <Card padding="lg" className="text-center text-sm text-slate-500 dark:text-slate-400">
        No teams available.
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-emerald-100 dark:border-emerald-800">
        <div className="mb-2 flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team SDG submissions</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          SDG goals and descriptions submitted by each team, grouped by batch.
        </p>
      </Card>

      {teamsByBatch.map(([batchName, batchTeams]) => (
        <section key={batchName} className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {batchName}
          </h4>
          {batchTeams.map((team) => {
            const teamEntries = entriesByTeam.get(team.id) ?? []
            return (
              <Card key={team.id} padding="md" className="border-slate-200 dark:border-slate-700">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-violet-700 dark:text-violet-300">
                      {team.batch_code}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Supervisor: {team.supervisor_name ?? '—'}
                      {team.reviewer_name ? ` · Reviewer: ${team.reviewer_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {teamEntries.length} SDG{teamEntries.length === 1 ? '' : 's'}
                  </span>
                </div>

                {teamEntries.length === 0 ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">No SDG submitted yet</p>
                ) : (
                  <div className="space-y-2">
                    {teamEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {getSdgLabel(entry.sdg_goal)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                          {entry.description}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </section>
      ))}
    </div>
  )
}
