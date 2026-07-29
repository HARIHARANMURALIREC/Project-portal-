import { Download, FileText, Presentation, BookOpen, Newspaper } from 'lucide-react'
import { StudentPageShell } from '@/components/student/StudentPageShell'

interface TemplateCard {
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

const templates: TemplateCard[] = [
  {
    id: 'literature-survey',
    title: 'Literature Survey Format',
    description:
      'Standard template for documenting your literature survey. Follow this format to present related works, research gaps, and comparative analysis.',
    fileLabel: 'DOCX Template',
    badge: 'Required',
    badgeColor: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800',
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
      'PowerPoint template for your first project review presentation. Includes slide structure for problem statement, objectives, methodology, and expected outcomes.',
    fileLabel: 'PPTX Template',
    badge: 'Required',
    badgeColor: 'bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-800',
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
      'Official format for submitting your review report. Covers abstract, introduction, system design, implementation details, results, and conclusion sections.',
    fileLabel: 'DOCX Template',
    badge: 'Required',
    badgeColor: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800',
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
      'Guidelines and criteria for selecting relevant IEEE / Scopus / SCI journal papers for your project. Includes tips on identifying credible sources and citation norms.',
    fileLabel: 'PDF Guide',
    badge: 'Reference',
    badgeColor: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800',
    icon: Newspaper,
    iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-100 dark:border-sky-800/50',
    downloadUrl: null,
  },
]

function TemplateDownloadCard({ tpl }: { tpl: TemplateCard }) {
  const Icon = tpl.icon

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-app-surface ${tpl.borderColor}`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${tpl.iconBg}`} />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tpl.iconBg}`}>
            <Icon className={`h-6 w-6 ${tpl.iconColor}`} />
          </div>
          <span
            className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tpl.badgeColor}`}
          >
            {tpl.badge}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{tpl.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{tpl.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          <span className="text-xs text-slate-400 dark:text-slate-500">{tpl.fileLabel}</span>

          {tpl.downloadUrl ? (
            <a
              id={`download-${tpl.id}`}
              href={tpl.downloadUrl}
              download
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition active:scale-95 ${tpl.iconBg} ${tpl.iconColor} hover:opacity-90`}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Download className="h-3.5 w-3.5" />
              Coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function StudentUploads() {
  return (
    <StudentPageShell title="Uploads" activeNav="uploads">
      {() => (
        <div>
          {/* Page header */}
          <div className="mb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Download the official templates and guidelines provided by your department. Use these formats for
              submissions and presentations.
            </p>
          </div>

          {/* Notice banner */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/30">
            <span className="mt-0.5 text-amber-600 dark:text-amber-400">⚠️</span>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Use <strong>only</strong> the formats provided below for your review submissions. Deviating from the
              prescribed format may result in rejection of your submission.
            </p>
          </div>

          {/* Template cards grid */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
            {templates.map((tpl) => (
              <TemplateDownloadCard key={tpl.id} tpl={tpl} />
            ))}
          </div>
        </div>
      )}
    </StudentPageShell>
  )
}
