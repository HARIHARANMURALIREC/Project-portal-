import { StudentPageShell } from '@/components/student/StudentPageShell'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { getStudentAcademicInfo } from '@/lib/mappers'
import type { StudentContext } from '@/types/student'

function StudentProfileContent({ context }: { context: StudentContext }) {
  const { profile } = useAuth()
  const { team, members, batch } = context
  const academic = getStudentAcademicInfo(batch.id)

  const currentMember = members.find((m) => m.user_id === profile?.id)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card padding="lg" className="border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Profile</h3>
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Full Name</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{profile?.full_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Registration No.</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{profile?.reg_no ?? currentMember?.reg_no ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Team ID</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{team.batch_code}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Department</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{academic.department}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Section</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{academic.section}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Year</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{academic.year}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Semester</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{academic.semester}</dd>
          </div>
          {team.supervisor_name && (
            <div>
              <dt className="text-sm text-slate-500 dark:text-slate-400">Supervisor</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{team.supervisor_name}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card padding="lg" className="border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team Members</h3>
        <ul className="mt-4 space-y-3">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/80"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{m.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{m.reg_no}</p>
              </div>
              {m.user_id === profile?.id && (
                <span className="rounded-full bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-800">
                  You
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export function StudentProfile() {
  return (
    <StudentPageShell title="Profile" activeNav="profile">
      {(context) => <StudentProfileContent context={context} />}
    </StudentPageShell>
  )
}
