import { Download, FileText, Presentation, BookOpen, Newspaper } from 'lucide-react'

interface TemplateItem {
  id: string
  title: string
  description: string
  fileLabel: string
  badge: string
  badgeColor: string
  icon: typeof FileText
  iconBg: string
  iconColor: string
  borderColor: string
  downloadUrl: string | null
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 'literature-survey',
    title: 'Literature Survey Format',
    description:
      'Standard template for documenting the literature survey. Used to present related works, research gaps, and comparative analysis.',
    fileLabel: 'DOCX Template',
    badge: 'Required',
    badgeColor:
      'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800',
    icon: BookOpen,
    iconBg: 'bg-rose-50 dark:bg-rose-950/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-100 dark:border-rose-800/50',
    downloadUrl: null,
  },
  {
    id: 'first-review-ppt',
    title: 'Project First Review PPT Template',
    description:
      'PowerPoint template for the first project review presentation. Covers problem statement, objectives, methodology, and expected outcomes.',
    fileLabel: 'PPTX Template',
    badge: 'Required',
    badgeColor:
      'bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-800',
    icon: Presentation,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-100 dark:border-orange-800/50',
    downloadUrl: null,
  },
  {
    id: 'review-report',
    title: 'Review Report Format',
    description:
      'Official format for submitting the review report. Covers abstract, introduction, system design, implementation, results, and conclusion.',
    fileLabel: 'DOCX Template',
    badge: 'Required',
    badgeColor:
      'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800',
    icon: FileText,
    iconBg: 'bg-violet-50 dark:bg-violet-950/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-100 dark:border-violet-800/50',
    downloadUrl: null,
  },
  {
    id: 'selecting-journal-papers',
    title: 'Selecting Journal Papers',
    description:
      'Guidelines for selecting relevant IEEE / Scopus / SCI journal papers. Includes tips on identifying credible sources and citation norms.',
    fileLabel: 'PDF Guide',
    badge: 'Reference',
    badgeColor:
      'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800',
    icon: Newspaper,
    iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-100 dark:border-sky-800/50',
    downloadUrl: null,
  },
]

function TemplateCard({ tpl }: { tpl: TemplateItem }) {
  const Icon = tpl.icon
  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-app-surface ${tpl.borderColor}`}
    >
      <div className={`h-1 w-full ${tpl.iconBg}`} />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tpl.iconBg}`}>
            <Icon className={`h-5 w-5 ${tpl.iconColor}`} />
          </div>
          <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tpl.badgeColor}`}>
            {tpl.badge}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{tpl.title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tpl.description}</p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{tpl.fileLabel}</span>
          {tpl.downloadUrl ? (
            <a
              id={`download-${tpl.id}`}
              href={tpl.downloadUrl}
              download
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 ${tpl.iconBg} ${tpl.iconColor} hover:opacity-90`}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Download className="h-3.5 w-3.5" />
              Coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/** Shared panel used in student, supervisor, reviewer, and coordinator pages. */
export function TemplatesPanel() {
  return (
    <div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Official templates and guidelines provided by the department. These formats must be used for review
        submissions and presentations.
      </p>

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/30">
        <span className="mt-0.5 text-amber-600 dark:text-amber-400">⚠️</span>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Inform your teams to use <strong>only</strong> the formats provided below. Deviating from prescribed
          formats may result in rejection of submissions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((tpl) => (
          <TemplateCard key={tpl.id} tpl={tpl} />
        ))}
      </div>
    </div>
  )
}
