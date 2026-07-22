import type { TeamWithDetails } from '@/types/database'

interface TeamProjectTopicProps {
  team: Pick<TeamWithDetails, 'selected_project_id' | 'projects'>
  className?: string
}

/** Selected project title/domain for a team (supervisor & reviewer views). */
export function TeamProjectTopic({ team, className = '' }: TeamProjectTopicProps) {
  const title = team.projects?.title?.trim()
  const domain = team.projects?.domain?.trim()

  if (!team.selected_project_id || !title) {
    return (
      <p className={`text-sm text-amber-700 dark:text-amber-300 ${className}`}>
        <span className="font-medium text-slate-600 dark:text-slate-400">Project: </span>
        Not selected yet
      </p>
    )
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Selected project
      </p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        {domain && (
          <span className="shrink-0 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
            {domain}
          </span>
        )}
        <p className="min-w-0 text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
      </div>
    </div>
  )
}
