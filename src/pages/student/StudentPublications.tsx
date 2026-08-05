import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Newspaper, Upload, FileText, X, Send, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { StudentPageShell } from '@/components/student/StudentPageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { TEMPLATE_ACCEPT_PPT_WORD } from '@/lib/templateUploads'
import {
  PUBLICATION_STATUSES,
  createTeamPublicationEntry,
  deleteTeamPublicationEntry,
  fetchTeamPublicationEntries,
  formatPublicationDate,
  getPublicationFileUrl,
  getPublicationStatusLabel,
  type TeamPublicationEntry,
} from '@/lib/publications'
import type { StudentContext } from '@/types/student'

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function PublicationsPageContent({ context }: { context: StudentContext }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const teamId = context.team.id
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const [details, setDetails] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const today = useMemo(() => getTodayDateString(), [])

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['team-publication-entries', teamId],
    queryFn: () => fetchTeamPublicationEntries(teamId),
  })

  const clearFile = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const resetForm = () => {
    setStatus('')
    setDetails('')
    clearFile()
  }

  const canSubmit = details.trim().length > 0

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in')
      if (!details.trim()) throw new Error('Details are required')
      return createTeamPublicationEntry({
        teamId,
        status,
        details,
        entryDate: today,
        userId: user.id,
        file,
      })
    },
    onSuccess: (entry) => {
      toast.success(`Publication submitted (${getPublicationStatusLabel(entry.status)})`)
      resetForm()
      void queryClient.invalidateQueries({ queryKey: ['team-publication-entries', teamId] })
      void queryClient.invalidateQueries({ queryKey: ['all-team-publication-entries'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Submit failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (entry: TeamPublicationEntry) => deleteTeamPublicationEntry(entry),
    onSuccess: () => {
      toast.success('Publication removed')
      void queryClient.invalidateQueries({ queryKey: ['team-publication-entries', teamId] })
      void queryClient.invalidateQueries({ queryKey: ['all-team-publication-entries'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
  })

  return (
    <div className="space-y-4">
      <Card padding="lg" className="border-sky-100 dark:border-sky-800">
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Publications</h3>
        </div>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
          Select the current status of your publication, enter details for that stage, and upload the
          related file. Submitted entries appear below and are visible to your supervisor and
          coordinator.
        </p>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-4">
            <Select
              label="Publication status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm"
            >
              <option value="">Select status</option>
              {PUBLICATION_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>

            <div>
              <Input
                label="Date"
                type="date"
                value={today}
                readOnly
                className="cursor-default bg-slate-50 dark:bg-slate-800/60"
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                Auto-filled: {formatPublicationDate(today)}
              </p>
            </div>
          </div>

          <div className="w-full">
            <label
              htmlFor="publication-details"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Details
            </label>
            <textarea
              id="publication-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Enter details for the selected publication status…"
              className="h-36 w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-app-surface dark:text-slate-100 dark:focus:border-primary-400 md:h-40"
            />
          </div>

          <div className="w-full">
            <p className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Upload</p>
            {file ? (
              <div className="flex h-36 flex-col justify-between rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/30 md:h-40">
                <div className="flex min-w-0 items-start gap-2">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-900/40"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-sky-200 bg-sky-50/50 px-4 text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-300 dark:hover:bg-sky-950/40 md:h-40"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-semibold">Upload file</span>
                <span className="text-center text-xs text-sky-600/80 dark:text-sky-400/80">
                  PPT or Word (.ppt, .pptx, .doc, .docx)
                </span>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={TEMPLATE_ACCEPT_PPT_WORD}
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null
                setFile(selected)
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Submit
          </Button>
        </div>
      </Card>

      <Card padding="lg">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Submitted publications
          </h3>
        </div>

        {isLoading ? (
          <TableSkeleton rows={3} />
        ) : submissions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No publications submitted yet. Fill the form above and click Submit.
          </p>
        ) : (
          <div className="space-y-3">
            {submissions.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {getPublicationStatusLabel(item.status)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatPublicationDate(item.entry_date)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (confirm('Delete this publication entry?')) deleteMutation.mutate(item)
                    }}
                    className="gap-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {item.details}
                </p>
                {item.original_filename && item.storage_path && (
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
                    onClick={() => {
                      void (async () => {
                        try {
                          const url = await getPublicationFileUrl(item.storage_path!)
                          window.open(url, '_blank', 'noopener,noreferrer')
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Download failed')
                        }
                      })()
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {item.original_filename}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export function StudentPublications() {
  return (
    <StudentPageShell title="Publications" activeNav="publications">
      {(context) => <PublicationsPageContent context={context} />}
    </StudentPageShell>
  )
}
