import type { TeamWithDetails } from '@/types/database'

/** Ascending by registration number (numeric when possible). */
export function sortTeamMembers<T extends { reg_no: string }>(members: T[]): T[] {
  return [...members].sort((a, b) =>
    a.reg_no.localeCompare(b.reg_no, undefined, { numeric: true }),
  )
}

/** Ascending within each batch: batch A→D, then team 1→n. */
export function sortTeamsInBatch<T extends { batch_id: string; team_no: number }>(teams: T[]): T[] {
  return [...teams].sort((a, b) => {
    const batchOrder = a.batch_id.localeCompare(b.batch_id)
    if (batchOrder !== 0) return batchOrder
    return a.team_no - b.team_no
  })
}

export function withSortedTeamMembers<T extends TeamWithDetails>(team: T): T {
  if (!team.team_members?.length) return team
  return {
    ...team,
    team_members: sortTeamMembers(team.team_members),
  }
}

export function withSortedTeams<T extends TeamWithDetails>(teams: T[]): T[] {
  return sortTeamsInBatch(teams).map(withSortedTeamMembers)
}
