interface StatusBadgeProps {
  status: 'open' | 'locked' | 'pending'
  label?: string
}

const styles: Record<StatusBadgeProps['status'], string> = {
  open: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  locked: 'bg-red-100 text-red-800 ring-red-200',
  pending: 'bg-slate-100 text-slate-600 ring-slate-200',
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
