import { supabase } from '@/lib/supabase'

export const TEMPLATE_SUBMISSIONS_BUCKET = 'template-submissions'

export type TemplateType =
  | 'literature_survey'
  | 'first_review_ppt'
  | 'review_report'
  | 'journal_papers'
  | 'second_journal_papers'
  | 'second_review_report'
  | 'second_review_ppt'

export interface TemplateConfig {
  type: TemplateType
  label: string
  description: string
  accept: string
  iconBg: string
  iconColor: string
  borderColor: string
  badgeColor: string
  badge: string
}

/** PowerPoint only. */
export const TEMPLATE_ACCEPT_PPT =
  [
    '.ppt',
    '.pptx',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ].join(',')

/** PDF only. */
export const TEMPLATE_ACCEPT_PDF = ['.pdf', 'application/pdf'].join(',')

/** PowerPoint and PDF (no Word). */
export const TEMPLATE_ACCEPT_PPT_PDF = [TEMPLATE_ACCEPT_PPT, TEMPLATE_ACCEPT_PDF].join(',')

/** PowerPoint and Word only (e.g. First Review PPT). */
export const TEMPLATE_ACCEPT_PPT_WORD =
  [
    '.ppt',
    '.pptx',
    '.doc',
    '.docx',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ].join(',')

/** Word, PowerPoint, and PDF (Literature Survey, Review Report, Journal Papers). */
export const TEMPLATE_ACCEPT_PPT_WORD_PDF =
  [
    '.ppt',
    '.pptx',
    '.doc',
    '.docx',
    '.pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
  ].join(',')

export const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    type: 'literature_survey',
    label: 'Literature Survey',
    description: 'Document all related works, research gaps, and comparative analysis.',
    accept: TEMPLATE_ACCEPT_PPT_WORD_PDF,
    iconBg: 'bg-rose-50 dark:bg-rose-950/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-100 dark:border-rose-800/50',
    badgeColor: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800',
    badge: 'Required',
  },
  {
    type: 'first_review_ppt',
    label: 'First Review PPT',
    description: 'Presentation for the first review — problem statement, objectives, methodology, outcomes.',
    accept: TEMPLATE_ACCEPT_PPT_WORD,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-100 dark:border-orange-800/50',
    badgeColor: 'bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-800',
    badge: 'Required',
  },
  {
    type: 'review_report',
    label: 'Review Report',
    description: 'Formal report with abstract, introduction, design, implementation, results, and conclusion.',
    accept: TEMPLATE_ACCEPT_PPT_WORD_PDF,
    iconBg: 'bg-violet-50 dark:bg-violet-950/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-100 dark:border-violet-800/50',
    badgeColor: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800',
    badge: 'Required',
  },
  {
    type: 'journal_papers',
    label: 'Journal Papers',
    description: 'IEEE / Scopus / SCI papers relevant to your project domain.',
    accept: TEMPLATE_ACCEPT_PPT_WORD_PDF,
    iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-100 dark:border-sky-800/50',
    badgeColor: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800',
    badge: 'Reference',
  },
]

/** Second Review student uploads (separate from First Review files). */
export const SECOND_REVIEW_TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    type: 'second_journal_papers',
    label: 'Journal Papers',
    description: 'IEEE / Scopus / SCI papers — PowerPoint or PDF.',
    accept: TEMPLATE_ACCEPT_PPT_PDF,
    iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-100 dark:border-sky-800/50',
    badgeColor:
      'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800',
    badge: 'Required',
  },
  {
    type: 'second_review_report',
    label: 'Review Report',
    description: 'Formal second review report — PDF only.',
    accept: TEMPLATE_ACCEPT_PDF,
    iconBg: 'bg-violet-50 dark:bg-violet-950/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-100 dark:border-violet-800/50',
    badgeColor:
      'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800',
    badge: 'Required',
  },
  {
    type: 'second_review_ppt',
    label: 'Second Review PPT',
    description: 'Presentation for the second review — PowerPoint only.',
    accept: TEMPLATE_ACCEPT_PPT,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-100 dark:border-orange-800/50',
    badgeColor:
      'bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-800',
    badge: 'Required',
  },
]

export const SECOND_REVIEW_UPLOAD_TYPES = SECOND_REVIEW_TEMPLATE_CONFIGS.map((c) => c.type)

export const ALL_TEMPLATE_CONFIGS: TemplateConfig[] = [
  ...TEMPLATE_CONFIGS,
  ...SECOND_REVIEW_TEMPLATE_CONFIGS,
]

export function templateAcceptLabel(accept: string): string {
  const hasPdf = accept.includes('.pdf')
  const hasPpt = accept.includes('.ppt')
  const hasWord = accept.includes('.doc')
  if (hasPdf && hasPpt && hasWord) return 'PPT / Word / PDF'
  if (hasPdf && hasPpt) return 'PPT / PDF'
  if (hasPdf && !hasPpt) return 'PDF'
  if (hasPpt && !hasPdf) return 'PPT'
  return 'PPT / Word'
}

function fileMatchesAccept(file: File, accept: string): boolean {
  const parts = accept.split(',').map((p) => p.trim().toLowerCase())
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  const mime = file.type.toLowerCase()
  return parts.some((p) => p === ext || p === mime)
}

export function validateTemplateFile(file: File, templateType: TemplateType): void {
  const config = ALL_TEMPLATE_CONFIGS.find((c) => c.type === templateType)
  if (!config) return
  if (!fileMatchesAccept(file, config.accept)) {
    throw new Error(`Invalid file type. Allowed: ${templateAcceptLabel(config.accept)}`)
  }
}

// ── Types ────────────────────────────────────────────────────

export interface CoordinatorTemplateFile {
  id: string
  template_type: TemplateType
  storage_path: string
  original_filename: string
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface TeamTemplateUpload {
  id: string
  team_id: string
  template_type: TemplateType
  storage_path: string
  original_filename: string
  uploaded_by: string
  created_at: string
  updated_at: string
}

export type TeamTemplateUploadWithTeam = TeamTemplateUpload & {
  teams?: {
    batch_code: string
    supervisor_name: string | null
    batch_id: string
  } | null
}

const TEAM_CODE_RE = /(?<![a-zA-Z0-9])27([A-D])(\d{2})(?![a-zA-Z0-9])/i

/** Extract a team code (e.g. 27A01) from filenames when team row is not joined. */
export function extractTeamCodeFromText(text: string): string | null {
  const match = TEAM_CODE_RE.exec(text)
  if (!match) return null
  return `27${match[1].toUpperCase()}${match[2]}`
}

export function teamLabelFromUpload(
  upload: TeamTemplateUploadWithTeam,
  team?: { batch_code: string } | null,
): string {
  if (team?.batch_code) return team.batch_code
  if (upload.teams?.batch_code) return upload.teams.batch_code
  const fromName = extractTeamCodeFromText(upload.original_filename)
  if (fromName) return fromName
  const fromPath = extractTeamCodeFromText(upload.storage_path)
  if (fromPath) return fromPath
  return upload.team_id.slice(0, 8)
}

// ── Coordinator demo files ────────────────────────────────────

export async function fetchCoordinatorTemplates(): Promise<CoordinatorTemplateFile[]> {
  const { data, error } = await supabase.from('coordinator_template_files').select('*')
  if (error) throw error
  return (data ?? []) as CoordinatorTemplateFile[]
}

export async function uploadCoordinatorTemplate(
  file: File,
  templateType: TemplateType,
  userId: string,
): Promise<CoordinatorTemplateFile> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `coordinator/${templateType}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(TEMPLATE_SUBMISSIONS_BUCKET)
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data: existing } = await supabase
    .from('coordinator_template_files')
    .select('id')
    .eq('template_type', templateType)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from('coordinator_template_files')
      .update({
        storage_path: path,
        original_filename: file.name,
        uploaded_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data as CoordinatorTemplateFile
  }

  const { data, error } = await supabase
    .from('coordinator_template_files')
    .insert({ template_type: templateType, storage_path: path, original_filename: file.name, uploaded_by: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as CoordinatorTemplateFile
}

export async function deleteCoordinatorTemplate(file: CoordinatorTemplateFile): Promise<void> {
  const { error } = await supabase.from('coordinator_template_files').delete().eq('id', file.id)
  if (error) throw error
  await supabase.storage.from(TEMPLATE_SUBMISSIONS_BUCKET).remove([file.storage_path])
}

// ── Student / team submissions ────────────────────────────────

export async function fetchTeamTemplateUploads(teamId: string): Promise<TeamTemplateUpload[]> {
  const { data, error } = await supabase
    .from('team_template_uploads')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TeamTemplateUpload[]
}

export async function fetchAllTeamTemplateUploads(): Promise<TeamTemplateUploadWithTeam[]> {
  const { data, error } = await supabase
    .from('team_template_uploads')
    .select('*, teams (batch_code, supervisor_name, batch_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TeamTemplateUploadWithTeam[]
}

export async function uploadTeamTemplate(
  file: File,
  templateType: TemplateType,
  teamId: string,
  userId: string,
): Promise<TeamTemplateUpload> {
  validateTemplateFile(file, templateType)
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `teams/${teamId}/${templateType}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(TEMPLATE_SUBMISSIONS_BUCKET)
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data: existing } = await supabase
    .from('team_template_uploads')
    .select('id')
    .eq('team_id', teamId)
    .eq('template_type', templateType)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from('team_template_uploads')
      .update({
        storage_path: path,
        original_filename: file.name,
        uploaded_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data as TeamTemplateUpload
  }

  const { data, error } = await supabase
    .from('team_template_uploads')
    .insert({
      team_id: teamId,
      template_type: templateType,
      storage_path: path,
      original_filename: file.name,
      uploaded_by: userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as TeamTemplateUpload
}

export async function deleteTeamTemplateUpload(upload: TeamTemplateUpload): Promise<void> {
  const { error } = await supabase.from('team_template_uploads').delete().eq('id', upload.id)
  if (error) throw error
  await supabase.storage.from(TEMPLATE_SUBMISSIONS_BUCKET).remove([upload.storage_path])
}

export async function getTemplateFileUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TEMPLATE_SUBMISSIONS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10)
  if (error || !data?.signedUrl) throw error ?? new Error('Failed to create download link')
  return data.signedUrl
}

export async function downloadTemplateFileBlob(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(TEMPLATE_SUBMISSIONS_BUCKET)
    .download(storagePath)
  if (error || !data) throw error ?? new Error('Failed to download file')
  return data
}

export type ZipTemplateFileEntry = {
  storage_path: string
  original_filename: string
  batchCode: string
  documentLabel: string
}

function sanitizeZipSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() || 'untitled'
}

/** Pack First Review template uploads into a ZIP (TeamID / DocumentType / filename). */
export async function buildTemplateFilesZip(
  entries: ZipTemplateFileEntry[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  if (entries.length === 0) throw new Error('No uploaded files to download')

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const used = new Set<string>()
  const failures: string[] = []

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]
    try {
      const blob = await downloadTemplateFileBlob(entry.storage_path)
      const folder = `${sanitizeZipSegment(entry.batchCode)}/${sanitizeZipSegment(entry.documentLabel)}`
      const safeName = sanitizeZipSegment(entry.original_filename)
      let path = `${folder}/${safeName}`
      if (used.has(path.toLowerCase())) {
        const dot = safeName.lastIndexOf('.')
        const base = dot > 0 ? safeName.slice(0, dot) : safeName
        const ext = dot > 0 ? safeName.slice(dot) : ''
        let n = 2
        while (used.has(path.toLowerCase())) {
          path = `${folder}/${base}_${n}${ext}`
          n += 1
        }
      }
      used.add(path.toLowerCase())
      zip.file(path, blob)
    } catch {
      failures.push(`${entry.batchCode}/${entry.documentLabel}/${entry.original_filename}`)
    }
    onProgress?.(i + 1, entries.length)
  }

  if (used.size === 0) {
    throw new Error(
      failures.length > 0
        ? `Could not download any files (${failures.length} failed)`
        : 'No uploaded files to download',
    )
  }

  return zip.generateAsync({ type: 'blob' })
}
