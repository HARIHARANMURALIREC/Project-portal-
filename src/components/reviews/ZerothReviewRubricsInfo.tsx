import {
  ZEROTH_REVIEW_RUBRICS,
  ZEROTH_REVIEW_TOTAL_MAX,
  isZerothReview,
} from '@/lib/reviewMarks'

/** Rubric criteria only — never shows entered marks (for students). */
export function ZerothReviewRubricsInfo({ reviewTitle }: { reviewTitle: string }) {
  if (!isZerothReview(reviewTitle)) return null

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-app-surface">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        Zeroth Review rubrics
      </p>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        Your supervisor and reviewer use these criteria. Scores are not shown to students.
      </p>
      <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
        {ZEROTH_REVIEW_RUBRICS.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3">
            <span>{r.label}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">Max {r.max}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 border-t border-slate-200 pt-1.5 font-semibold dark:border-slate-600">
          <span>Total</span>
          <span>Max {ZEROTH_REVIEW_TOTAL_MAX}</span>
        </li>
      </ul>
    </div>
  )
}
