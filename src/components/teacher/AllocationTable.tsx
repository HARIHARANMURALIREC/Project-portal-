import type { TeamWithDetails } from '@/types/database'

export function memberNames(team: TeamWithDetails): string {
  return team.team_members?.map((m) => m.name).join(', ') ?? '—'
}

export function memberRegNos(team: TeamWithDetails): string {
  return team.team_members?.map((m) => m.reg_no).join(', ') ?? '—'
}

interface AllocationTableProps {
  teams: TeamWithDetails[]
  showSupervisor?: boolean
  emptyMessage?: string
}

export function AllocationTable({
  teams,
  showSupervisor = false,
  emptyMessage = 'No project allocations yet.',
}: AllocationTableProps) {
  if (teams.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
        <thead className="sticky top-0 z-10 bg-white dark:bg-app-surface shadow-sm">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Team ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Names</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Reg No</th>
            {showSupervisor && (
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Supervisor</th>
            )}
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Domain</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Project</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {teams.map((team) => (
            <tr key={team.id} className="transition hover:bg-violet-50/50 dark:hover:bg-violet-950/30">
              <td className="px-4 py-3">
                <span className="rounded-md bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-800">
                  {team.batch_code}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{memberNames(team)}</td>
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{memberRegNos(team)}</td>
              {showSupervisor && (
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{team.supervisor_name ?? '—'}</td>
              )}
              <td className="px-4 py-3 text-violet-700 dark:text-violet-300">{team.projects?.domain ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{team.projects?.title ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface PendingTeamsTableProps {
  teams: TeamWithDetails[]
  showSupervisor?: boolean
  showStatus?: boolean
}

export function PendingTeamsTable({
  teams,
  showSupervisor = true,
  showStatus = false,
}: PendingTeamsTableProps) {
  if (teams.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        All eligible teams have selected a project.
      </p>
    )
  }

  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
        <thead className="sticky top-0 z-10 bg-white dark:bg-app-surface shadow-sm">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Team ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Names</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Reg No</th>
            {showSupervisor && (
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Supervisor</th>
            )}
            {showStatus && (
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {teams.map((team) => (
            <tr key={team.id} className="transition hover:bg-amber-50/50 dark:hover:bg-amber-950/20">
              <td className="px-4 py-3">
                <span className="rounded-md bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 dark:text-amber-300 ring-1 ring-amber-100 dark:ring-amber-900">
                  {team.batch_code}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{memberNames(team)}</td>
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{memberRegNos(team)}</td>
              {showSupervisor && (
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{team.supervisor_name ?? '—'}</td>
              )}
              {showStatus && (
                <td className="px-4 py-3">
                  {team.selection_blocked ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      Blocked
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Pending
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
