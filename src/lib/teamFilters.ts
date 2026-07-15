import type { TeamWithDetails } from '@/types/database'

export function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b),
  )
}

export function teamBatchOptions(teams: TeamWithDetails[]): { id: string; label: string }[] {
  const map = new Map<string, string>()
  for (const t of teams) {
    if (!t.batch_id) continue
    map.set(t.batch_id, t.batches?.name ?? t.batch_id)
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function teamMatchesFilters(
  team: Pick<TeamWithDetails, 'batch_id' | 'batch_code' | 'supervisor_name' | 'reviewer_name' | 'team_members'> & {
    projects?: { title?: string | null; domain?: string | null } | null
  },
  filters: {
    batchId?: string
    supervisor?: string
    reviewer?: string
    domain?: string
    search?: string
  },
): boolean {
  if (filters.batchId && team.batch_id !== filters.batchId) return false
  if (filters.supervisor && team.supervisor_name !== filters.supervisor) return false
  if (filters.reviewer && team.reviewer_name !== filters.reviewer) return false
  if (filters.domain && team.projects?.domain !== filters.domain) return false

  const term = filters.search?.trim().toLowerCase()
  if (!term) return true

  const members = (team.team_members ?? [])
    .map((m) => `${m.name} ${m.reg_no}`)
    .join(' ')
    .toLowerCase()

  return (
    team.batch_code.toLowerCase().includes(term) ||
    (team.supervisor_name ?? '').toLowerCase().includes(term) ||
    (team.reviewer_name ?? '').toLowerCase().includes(term) ||
    (team.projects?.title ?? '').toLowerCase().includes(term) ||
    (team.projects?.domain ?? '').toLowerCase().includes(term) ||
    members.includes(term)
  )
}
