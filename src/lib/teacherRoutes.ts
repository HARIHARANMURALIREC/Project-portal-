import type { Profile } from '@/types/database'
import { getBatchLabel, getBatchIdForCoordinator, isBatchCoordinator } from '@/lib/batchCoordinators'

export function isLeadCoordinator(profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined): boolean {
  return profile?.role === 'teacher' && !profile.supervisor_name
}

/** Lead coordinator or section batch coordinator — both use /coordinator pages. */
export function isCoordinatorPortalUser(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): boolean {
  return isLeadCoordinator(profile) || isBatchCoordinator(profile)
}

export function coordinatorRoleLabel(
  profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined,
): string {
  if (isLeadCoordinator(profile)) return 'Lead Coordinator'
  const batchId = getBatchIdForCoordinator(profile)
  return batchId ? `${getBatchLabel(batchId)} Coordinator` : 'Coordinator'
}

export function teacherHomePath(profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined): string {
  if (profile?.role !== 'teacher') return '/login'
  if (isCoordinatorPortalUser(profile)) return '/coordinator'
  return '/teacher'
}
