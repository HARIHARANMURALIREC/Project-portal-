import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  FolderKanban,
  CheckCircle2,
  Clock,
  BookOpen,
  AlertCircle,
} from 'lucide-react'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { TeamMemberCard } from '@/components/student/TeamMemberCard'
import { Card } from '@/components/ui/Card'
import { getProjects } from '@/lib/studentApi'
import { POLL_INTERVALS } from '@/lib/queryConfig'
import { getStudentAcademicInfo, getTeamMembersForForm, truncateText } from '@/lib/mappers'
import { canSelectProject, getProjectStatusLabel, getWelcomeMessage, isSelectionBlocked, isSupervisorAssignedProject } from '@/lib/studentRules'
import type { StudentContext } from '@/types/student'

function teamDisplayName(batchCode: string) {
  return `Team ${batchCode}`
}

function StudentDashboardContent({ context }: { context: StudentContext }) {
  const { team, members, batch, selectedProject, selectionBlocked } = context
  const academic = getStudentAcademicInfo(batch.id)
  const teamName = teamDisplayName(team.batch_code)
  const [member1, member2] = getTeamMembersForForm(members, batch.id)

  const { data: allProjects = [] } = useQuery({
    queryKey: ['all-projects-count'],
    queryFn: getProjects,
    refetchInterval: POLL_INTERVALS.studentContext,
    refetchOnWindowFocus: true,
  })

  const canSelect = canSelectProject(team, selectionBlocked)
  const hasAssigned = !!selectedProject
  const blocked = isSelectionBlocked(team, selectionBlocked)

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-violet-600 to-primary-700 p-6 text-white ring-1 ring-violet-50 dark:ring-violet-9000/20">
        <h2 className="text-2xl font-bold">Welcome, {teamName}!</h2>
        <p className="mt-2 text-violet-100">{getWelcomeMessage(team, selectionBlocked)}</p>
      </div>

      <Card padding="lg" className="border-violet-100 dark:border-violet-800 ring-1 ring-violet-50 dark:ring-violet-900">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team Details</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Team ID</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{team.batch_code}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Team Name</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{teamName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Department</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{academic.department}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Section</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{academic.section}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
            {hasAssigned ? (
              <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                isSupervisorAssignedProject(team)
                  ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}>
                {getProjectStatusLabel(team)}
              </span>
            ) : blocked ? (
              <span className="mt-1 inline-flex rounded-full bg-red-100 dark:bg-red-950/60 px-3 py-1 text-sm font-semibold text-red-700 dark:text-red-300">
                {team.selection_blocked && !selectionBlocked ? 'Blocked (Team)' : 'Selection Closed'}
              </span>
            ) : (
              <span className="mt-1 inline-flex rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
                Pending Selection
              </span>
            )}
          </div>
        </div>

        {team.supervisor_name && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Supervisor: <span className="font-medium">{team.supervisor_name}</span>
          </p>
        )}

        <div className="my-6 border-t border-slate-200 dark:border-slate-700" />

        <p className="mb-4 font-medium text-slate-700 dark:text-slate-300">Team Members</p>

        <div className="grid gap-4 lg:grid-cols-2">
          <TeamMemberCard memberNumber={1} member={member1} accent="violet" />
          <TeamMemberCard memberNumber={2} member={member2} accent="emerald" />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card padding="lg" className="border-violet-100 dark:border-violet-800 bg-gradient-to-br from-violet-50 dark:from-violet-950/50 to-white dark:to-app-surface ring-1 ring-violet-50 dark:ring-violet-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/60">
              <FolderKanban className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Available Projects</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{allProjects.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="border-emerald-100 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 dark:from-emerald-950/50 to-white dark:to-app-surface ring-1 ring-emerald-50 dark:ring-emerald-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60">
              {hasAssigned ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Selection Status</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {hasAssigned
                  ? isSupervisorAssignedProject(team)
                    ? 'Assigned'
                    : 'Done'
                  : blocked
                    ? 'Closed'
                    : 'Pending'}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="border-slate-200 dark:border-slate-700 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-app-surface">
              <Users className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Team Size</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{members.length} Members</p>
            </div>
          </div>
        </Card>
      </div>

      {selectedProject ? (
        <Card padding="lg" className="border-2 border-emerald-200 dark:border-emerald-800">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {isSupervisorAssignedProject(team) ? 'Your Assigned Project' : 'Your Selected Project'}
            </h3>
          </div>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 p-4">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">{selectedProject.title}</h4>
            {selectedProject.abstract && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {truncateText(selectedProject.abstract, 150)}
              </p>
            )}
            {selectedProject.domain && (
              <span className="mt-3 inline-flex rounded-full bg-violet-100 dark:bg-violet-950/60 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                {selectedProject.domain}
              </span>
            )}
            {team.supervisor_name && isSupervisorAssignedProject(team) && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Assigned under supervisor: <span className="font-medium">{team.supervisor_name}</span>
              </p>
            )}
            {team.locked_at && !isSupervisorAssignedProject(team) && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Selected on: {new Date(team.locked_at).toLocaleString()}
              </p>
            )}
            <Link
              to="/student/my-project"
              className="mt-4 inline-block text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:text-violet-300"
            >
              View Full Details →
            </Link>
          </div>
        </Card>
      ) : blocked ? (
        <Card padding="lg" className="border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
            <AlertCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project Selection Closed</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
            {team.selection_blocked && !selectionBlocked
              ? 'Project selection is blocked for your team. Please contact your administrator.'
              : 'The administrator has temporarily closed project selection for all teams. Please check back later.'}
          </p>
        </Card>
      ) : (
        <Card padding="lg" className="border-2 border-dashed border-slate-300 dark:border-slate-600 py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
            <AlertCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No Project Selected Yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Browse the available project topics and select one for your team before they are taken.
          </p>
          {canSelect && (
            <Link
              to="/student/topics"
              className="mt-6 inline-flex rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Browse Available Topics
            </Link>
          )}
        </Card>
      )}
    </div>
  )
}

export function StudentDashboard() {
  return (
    <StudentPageShell title="Dashboard" activeNav="dashboard">
      {(context) => <StudentDashboardContent context={context} />}
    </StudentPageShell>
  )
}
