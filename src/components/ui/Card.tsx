interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, className = '', padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-app-surface ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

const accentStyles = {
  primary: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300',
  neutral: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-app-surface dark:text-slate-200',
}

export function StatCard({ label, value, accent = 'neutral' }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${accentStyles[accent]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
