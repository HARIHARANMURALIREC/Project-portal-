import { supabase } from '@/lib/supabase'

export const TEMPLATE_SUBMISSIONS_BUCKET = 'template-submissions'

export type TemplateType =
  | 'literature_survey'
  | 'first_review_ppt'
  | 'review_report'
  | 'journal_papers'

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

export const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    type: 'literature_survey',
    label: 'Literature Survey',
    description: 'Document all related works, research gaps, and comparative analysis.',
    accept: '.doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    accept: '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
    accept: '.doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    accept: '.pdf,.doc,.docx',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-100 dark:border-sky-800/50',
    badgeColor: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800',
    badge: 'Reference',
  },
]

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

export async function fetchAllTeamTemplateUploads(): Promise<TeamTemplateUpload[]> {
  const { data, error } = await supabase
    .from('team_template_uploads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TeamTemplateUpload[]
}

export async function uploadTeamTemplate(
  file: File,
  templateType: TemplateType,
  teamId: string,
  userId: string,
): Promise<TeamTemplateUpload> {
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
