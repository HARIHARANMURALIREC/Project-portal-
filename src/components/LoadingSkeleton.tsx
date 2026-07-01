interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-app-surface">
      <Skeleton className="mb-3 h-5 w-1/4" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
