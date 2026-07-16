interface StatusBadgeProps {
  status: 'open' | 'locked' | 'pending'
  label?: string
}

const styles: Record<StatusBadgeProps['status'], string> = {
  open: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800',
  locked: 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800',
  pending: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-app-surface dark:text-slate-300 dark:ring-slate-600',
}

const defaultLabels: Record<StatusBadgeProps['status'], string> = {
  open: 'Open',
  locked: 'Locked',
  pending: 'Pending',
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
      {label ?? defaultLabels[status]}
    </span>
  )
}
