import { supabase } from '@/lib/supabase'
import type { ReviewFileType, TeamReview, TeamReviewFile } from '@/types/database'

export const REVIEW_SUBMISSIONS_BUCKET = 'review-submissions'

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Build suggested filename: 27A05_Review1.pdf */
export function buildSuggestedReviewFilename(input: {
  batchCode: string
  reviewTitle: string
  date?: Date
  fileType: ReviewFileType
}): string {
  const reviewToken = input.reviewTitle.replace(/\s+/g, '')
  const ext = input.fileType === 'pdf' ? 'pdf' : 'pptx'
  return `${input.batchCode}_${reviewToken}.${ext}`
}

export function validateReviewFilename(input: {
  filename: string
  batchCode: string
  reviewTitle: string
  fileType: ReviewFileType
}): { ok: true } | { ok: false; message: string } {
  const name = input.filename.trim()
  if (!name) return { ok: false, message: 'Filename is required' }

  const lower = name.toLowerCase()
  const batch = input.batchCode.trim().toUpperCase()
  if (!lower.includes(batch.toLowerCase())) {
    return {
      ok: false,
      message: `Filename must include team ID (${batch}), e.g. ${batch}_Review1.pdf`,
    }
  }

  const reviewNorm = normalizeToken(input.reviewTitle)
  const fileNorm = normalizeToken(name.replace(/\.[^.]+$/, ''))
  if (!fileNorm.includes(reviewNorm)) {
    return {
      ok: false,
      message: `Filename must include the review name (${input.reviewTitle.replace(/\s+/g, '')})`,
    }
  }

  if (input.fileType === 'pdf') {
    if (!lower.endsWith('.pdf')) {
      return { ok: false, message: 'PDF file must end with .pdf' }
    }
  } else if (!lower.endsWith('.ppt') && !lower.endsWith('.pptx')) {
    return { ok: false, message: 'PPT file must end with .ppt or .pptx' }
  }

  return { ok: true }
}

export async function fetchReviewFilesForTeam(teamId: string): Promise<TeamReviewFile[]> {
  const { data, error } = await supabase
    .from('team_review_files')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as TeamReviewFile[]
}

export async function fetchReviewFilesForReview(teamReviewId: string): Promise<TeamReviewFile[]> {
  const { data, error } = await supabase
    .from('team_review_files')
    .select('*')
    .eq('team_review_id', teamReviewId)

  if (error) throw error
  return (data ?? []) as TeamReviewFile[]
}

function storagePath(teamId: string, reviewId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `team/${teamId}/review/${reviewId}/${safe}`
}

export async function uploadReviewFile(input: {
  teamId: string
  review: TeamReview
  batchCode: string
  file: File
  fileType: ReviewFileType
  userId: string
}): Promise<TeamReviewFile> {
  const validation = validateReviewFilename({
    filename: input.file.name,
    batchCode: input.batchCode,
    reviewTitle: input.review.review_title,
    fileType: input.fileType,
  })
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  const path = storagePath(input.teamId, input.review.id, input.file.name)

  const { error: uploadError } = await supabase.storage
    .from(REVIEW_SUBMISSIONS_BUCKET)
    .upload(path, input.file, { upsert: true, contentType: input.file.type || undefined })

  if (uploadError) throw uploadError

  const { data: existing } = await supabase
    .from('team_review_files')
    .select('id')
    .eq('team_review_id', input.review.id)
    .eq('file_type', input.fileType)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from('team_review_files')
      .update({
        storage_path: path,
        original_filename: input.file.name,
        uploaded_by: input.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data as TeamReviewFile
  }

  const { data, error } = await supabase
    .from('team_review_files')
    .insert({
      team_id: input.teamId,
      team_review_id: input.review.id,
      file_type: input.fileType,
      storage_path: path,
      original_filename: input.file.name,
      uploaded_by: input.userId,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as TeamReviewFile
}

export async function getReviewFileDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(REVIEW_SUBMISSIONS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10)

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Failed to create download link')
  }
  return data.signedUrl
}
