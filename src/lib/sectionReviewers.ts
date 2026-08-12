import type { Profile } from '../types/database'
import { BATCH_LABELS } from './batchCoordinators'

export const SECTION_REVIEWERS = [
  {
    key: 'reviewer1',
    email: 'reviewer1@gmail.com',
    fullName: 'Reviewer 1',
    supervisorName: 'Section Reviewer 1',
    batchIds: ['A', 'B'] as const,
  },
  {
    key: 'reviewer2',
    email: 'reviewer2@gmail.com',
    fullName: 'Reviewer 2',
    supervisorName: 'Section Reviewer 2',
    batchIds: ['C', 'D'] as const,
  },
] as const

export type SectionReviewerConfig = (typeof SECTION_REVIEWERS)[number]

export function getSectionReviewerByEmail(email: string | null | undefined): SectionReviewerConfig | null {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  return SECTION_REVIEWERS.find((r) => r.email === normalized) ?? null
}

export function getSectionReviewerByProfile(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): SectionReviewerConfig | null {
  if (profile?.role !== 'teacher' || !profile.supervisor_name) return null
  return SECTION_REVIEWERS.find((r) => r.supervisorName === profile.supervisor_name) ?? null
}

export function isSectionReviewer(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): boolean {
  return getSectionReviewerByProfile(profile) != null
}

export function getSectionReviewerBatchIds(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): string[] {
  return [...(getSectionReviewerByProfile(profile)?.batchIds ?? [])]
}

export function getSectionReviewerLabel(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): string {
  const reviewer = getSectionReviewerByProfile(profile)
  if (!reviewer) return 'Reviewer'
  return reviewer.batchIds.map((id) => BATCH_LABELS[id] ?? `IT ${id}`).join(' & ')
}

export function isSectionReviewerEmail(email: string): boolean {
  return getSectionReviewerByEmail(email) != null
}
