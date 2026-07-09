export function SupervisorNotice({ supervisorName }: { supervisorName: string | null | undefined }) {
  if (!supervisorName) return null

  return (
    <p className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
      Project supervisor: <span className="font-semibold">{supervisorName}</span>
    </p>
  )
}
