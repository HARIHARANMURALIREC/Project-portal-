import type { TeamMemberFields } from '@/types/student'

type Accent = 'violet' | 'emerald'

interface TeamMemberCardProps {
  memberNumber: 1 | 2
  member: TeamMemberFields
  accent: Accent
}

const accentStyles: Record<Accent, { card: string; avatar: string }> = {
  violet: {
    card: 'bg-violet-50 border border-violet-100 dark:bg-violet-950/40 dark:border-violet-800',
    avatar: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  },
  emerald: {
    card: 'bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800',
    avatar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{value || '—'}</p>
    </div>
  )
}

export function TeamMemberCard({ memberNumber, member, accent }: TeamMemberCardProps) {
  const styles = accentStyles[accent]
  const avatarLabel = member.name.trim().charAt(0).toUpperCase() || `S${memberNumber}`

  return (
    <div className={`rounded-lg p-4 ${styles.card}`}>
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${styles.avatar}`}
        >
          {avatarLabel}
        </div>
        <p className="font-medium text-slate-900 dark:text-slate-100">Student {memberNumber}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyField label="Team Member Name" value={member.name} />
        <ReadOnlyField label="Roll No" value={member.roll_no} />
        <ReadOnlyField label="Department" value={member.department} />
        <ReadOnlyField label="Year" value={member.year} />
        <ReadOnlyField label="Semester" value={member.semester} />
        <ReadOnlyField label="Section" value={member.section} />
      </div>
    </div>
  )
}
