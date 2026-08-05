import { supabase } from '@/lib/supabase'
import { TEMPLATE_SUBMISSIONS_BUCKET } from '@/lib/templateUploads'

export const PUBLICATION_STATUSES = [
  { value: 'communicated', label: 'Communicated' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'payment', label: 'Payment' },
  { value: 'presented', label: 'Presented' },
  { value: 'published', label: 'Published' },
] as const

export type TeamPublicationEntry = {
  id: string
  team_id: string
  status: string
  details: string
  entry_date: string
  storage_path: string | null
  original_filename: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
}

export function getPublicationStatusLabel(value: string): string {
  return PUBLICATION_STATUSES.find((s) => s.value === value)?.label ?? (value || 'Not selected')
}

export function formatPublicationDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function fetchTeamPublicationEntries(teamId: string): Promise<TeamPublicationEntry[]> {
  const { data, error } = await supabase
    .from('team_publication_entries')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TeamPublicationEntry[]
}

export async function fetchAllTeamPublicationEntries(): Promise<TeamPublicationEntry[]> {
  const { data, error } = await supabase
    .from('team_publication_entries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TeamPublicationEntry[]
}

export async function createTeamPublicationEntry(input: {
  teamId: string
  status: string
  details: string
  entryDate: string
  userId: string
  file?: File | null
}): Promise<TeamPublicationEntry> {
  let storagePath: string | null = null
  let originalFilename: string | null = null

  if (input.file) {
    const ext = input.file.name.split('.').pop() ?? 'bin'
    storagePath = `teams/${input.teamId}/publications/${crypto.randomUUID()}.${ext}`
    originalFilename = input.file.name
    const { error: uploadError } = await supabase.storage
      .from(TEMPLATE_SUBMISSIONS_BUCKET)
      .upload(storagePath, input.file, { upsert: false })
    if (uploadError) throw uploadError
  }

  const { data, error } = await supabase
    .from('team_publication_entries')
    .insert({
      team_id: input.teamId,
      status: input.status,
      details: input.details.trim(),
      entry_date: input.entryDate,
      storage_path: storagePath,
      original_filename: originalFilename,
      uploaded_by: input.userId,
    })
    .select('*')
    .single()

  if (error) {
    if (storagePath) {
      await supabase.storage.from(TEMPLATE_SUBMISSIONS_BUCKET).remove([storagePath])
    }
    throw error
  }

  return data as TeamPublicationEntry
}

export async function deleteTeamPublicationEntry(entry: TeamPublicationEntry): Promise<void> {
  const { error } = await supabase.from('team_publication_entries').delete().eq('id', entry.id)
  if (error) throw error
  if (entry.storage_path) {
    await supabase.storage.from(TEMPLATE_SUBMISSIONS_BUCKET).remove([entry.storage_path])
  }
}

export async function getPublicationFileUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TEMPLATE_SUBMISSIONS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10)
  if (error || !data?.signedUrl) throw error ?? new Error('Failed to create download link')
  return data.signedUrl
}
