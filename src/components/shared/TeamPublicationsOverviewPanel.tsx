import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Calendar, Download, FileText, Newspaper } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import {
  fetchAllTeamPublicationEntries,
  formatPublicationDate,
  getPublicationFileUrl,
  getPublicationStatusLabel,
} from '@/lib/publications'
import type { TeamWithDetails } from '@/types/database'

export function TeamPublicationsOverviewPanel({ teams }: { teams: TeamWithDetails[] }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['all-team-publication-entries'],
    queryFn: fetchAllTeamPublicationEntries,
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
      <Card padding="lg" className="border-sky-100 dark:border-sky-800">
        <div className="mb-2 flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Team publication submissions
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Publication status, details, and files submitted by each team, grouped by batch.
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
                    {teamEntries.length} submission{teamEntries.length === 1 ? '' : 's'}
                  </span>
                </div>

                {teamEntries.length === 0 ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">No publications submitted yet</p>
                ) : (
                  <div className="space-y-2">
                    {teamEntries.map((entry) => (
                      <PublicationEntryCard key={entry.id} entry={entry} />
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

function PublicationEntryCard({
  entry,
}: {
  entry: Awaited<ReturnType<typeof fetchAllTeamPublicationEntries>>[number]
}) {
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/30">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {getPublicationStatusLabel(entry.status)}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Calendar className="h-3.5 w-3.5" />
        {formatPublicationDate(entry.entry_date)}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{entry.details}</p>
      {entry.original_filename && entry.storage_path && (
        <button
          type="button"
          disabled={busy}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
          onClick={() => {
            void (async () => {
              setBusy(true)
              try {
                const url = await getPublicationFileUrl(entry.storage_path!)
                window.open(url, '_blank', 'noopener,noreferrer')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Download failed')
              } finally {
                setBusy(false)
              }
            })()
          }}
        >
          <Download className="h-3.5 w-3.5" />
          <FileText className="h-3.5 w-3.5" />
          {busy ? 'Opening…' : entry.original_filename}
        </button>
      )}
    </div>
  )
}
