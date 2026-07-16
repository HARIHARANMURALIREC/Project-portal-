import type { Profile } from '@/types/database'

/** Section batch coordinators — must match profiles.supervisor_name exactly. */
export const BATCH_COORDINATORS: Record<string, string> = {
  A: 'Dr.M.Babu',
  B: 'Dr.P.Neelaveni',
  C: 'Dr.S.Nalini',
  D: 'Mr.R.Vinoth kumar',
}

export const BATCH_LABELS: Record<string, string> = {
  A: 'IT A',
  B: 'IT B',
  C: 'IT C',
  D: 'IT D',
}

export function getBatchIdForCoordinator(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): string | null {
  if (profile?.role !== 'teacher' || !profile.supervisor_name) return null
  const entry = Object.entries(BATCH_COORDINATORS).find(
    ([, name]) => name === profile.supervisor_name,
  )
  return entry?.[0] ?? null
}

export function isBatchCoordinator(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): boolean {
  return getBatchIdForCoordinator(profile) != null
}

export function getBatchLabel(batchId: string): string {
  return BATCH_LABELS[batchId] ?? `IT ${batchId}`
}
