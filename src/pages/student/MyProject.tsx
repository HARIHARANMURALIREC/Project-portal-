import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Card } from '@/components/ui/Card'
import {
  canSelectProject,
  isSelectionBlocked,
  isSupervisorAssignedProject,
} from '@/lib/studentRules'
import type { StudentContext } from '@/types/student'

function MyProjectContent({ context }: { context: StudentContext }) {
  const { team, selectedProject, selectionBlocked } = context
  const supervisorAssigned = isSupervisorAssignedProject(team)
  const canSelect = canSelectProject(team, selectionBlocked)
  const blocked = isSelectionBlocked(team, selectionBlocked)

  if (!selectedProject) {
    if (!canSelect && blocked) {
      return (
        <Card padding="lg" className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project selection closed</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {team.selection_blocked && !selectionBlocked
              ? 'Project selection is blocked for your team. Please contact your administrator.'
              : 'The administrator has temporarily closed project selection for all teams. Please check back later.'}
          </p>
        </Card>
      )
    }

    if (!canSelect) {
      return (
        <Card padding="lg" className="border-violet-200 bg-violet-50 dark:bg-violet-950/50 text-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project assigned</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Your team already has a project assigned
            {team.supervisor_name ? ` under ${team.supervisor_name}` : ' by your supervisor'}.
            Project details will appear here once synced. Contact your admin if this persists.
          </p>
        </Card>
      )
    }

    return (
      <Card padding="lg" className="border-2 border-dashed border-slate-300 dark:border-slate-600 py-10 text-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No project selected yet</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your team has not selected a project. Browse available topics to get started.
        </p>
        <Link
          to="/student/topics"
          className="mt-6 inline-flex rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Browse Available Topics
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-2 border-emerald-200 dark:border-emerald-800">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <StatusBadge
            status="locked"
            label={supervisorAssigned ? 'Supervisor Assigned' : 'Project Locked'}
          />
          {team.locked_at && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {supervisorAssigned ? 'Assigned' : 'Selected'} on{' '}
              {new Date(team.locked_at).toLocaleString()}
            </span>
          )}
        </div>

        {team.supervisor_name && supervisorAssigned && (
          <p className="mb-3 text-sm text-violet-700 dark:text-violet-300">
            This project was assigned under your supervisor{' '}
            <span className="font-semibold">{team.supervisor_name}</span>. You do not need to
            select a different project.
          </p>
        )}

        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedProject.title}</h2>

        {selectedProject.domain && (
          <span className="mt-3 inline-flex rounded-full bg-violet-100 dark:bg-violet-950/60 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
            {selectedProject.domain}
          </span>
        )}

        {selectedProject.s_no != null && (
          <p className="mt-3 font-mono text-sm text-slate-500 dark:text-slate-400">Project #{selectedProject.s_no}</p>
        )}

        <div className="mt-6 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Abstract</h4>
          {selectedProject.abstract ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {selectedProject.abstract}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">No abstract provided.</p>
          )}
        </div>

        <p className="mt-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
          {supervisorAssigned
            ? 'This assignment is final. Contact your supervisor or admin if you have questions.'
            : 'Your selection is final and cannot be changed.'}
        </p>
      </Card>
    </div>
  )
}

export function MyProject() {
  return (
    <StudentPageShell title="My Project" activeNav="project">
      {(context) => <MyProjectContent context={context} />}
    </StudentPageShell>
  )
}
