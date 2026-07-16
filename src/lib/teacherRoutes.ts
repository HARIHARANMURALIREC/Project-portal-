import type { Profile } from '@/types/database'

export function isLeadCoordinator(profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined): boolean {
  return profile?.role === 'teacher' && !profile.supervisor_name
}

export function teacherHomePath(profile: Pick<Profile, 'role' | 'supervisor_name'> | null | undefined): string {
  if (profile?.role !== 'teacher') return '/login'
  return isLeadCoordinator(profile) ? '/coordinator' : '/teacher'
}
