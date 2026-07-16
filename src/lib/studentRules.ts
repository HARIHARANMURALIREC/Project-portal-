import type { Team } from '@/types/database'

export function hasAssignedProject(team: Team): boolean {
  return !!team.selected_project_id
}

export function isSelectionBlocked(team: Team, globalBlocked = false): boolean {
  return globalBlocked || !!team.selection_blocked
}

/** Students may self-select when selection is open and the team has no project yet. */
export function canSelectProject(team: Team, globalBlocked = false): boolean {
  if (isSelectionBlocked(team, globalBlocked)) return false
  return !hasAssignedProject(team)
}

/** Pre-assigned by admin/supervisor (not claimed by a student in the portal). */
export function isSupervisorAssignedProject(team: Team): boolean {
  return !!team.selected_project_id && team.locked_by_user_id == null
}

export function getWelcomeMessage(team: Team, globalBlocked = false): string {
  if (isSelectionBlocked(team, globalBlocked) && !hasAssignedProject(team)) {
    if (team.selection_blocked && !globalBlocked) {
      return team.supervisor_name
        ? `Project selection is blocked for your team. Your supervisor is ${team.supervisor_name}. Contact your administrator.`
        : 'Project selection is blocked for your team. Please contact your administrator.'
    }
    return 'Project selection is currently closed by the administrator. Please check back later.'
  }
  if (!hasAssignedProject(team)) {
    return 'Explore available project topics and select one for your final year project.'
  }
  if (isSupervisorAssignedProject(team)) {
    return team.supervisor_name
      ? `Your project is already assigned under ${team.supervisor_name}. You do not need to select a project.`
      : 'Your project is already assigned by your supervisor. You do not need to select a project.'
  }
  return 'You have successfully selected your project. Good luck with your work!'
}

export function getProjectStatusLabel(team: Team): string {
  if (!hasAssignedProject(team)) return 'Pending Selection'
  if (isSupervisorAssignedProject(team)) return 'Supervisor Assigned'
  return 'Project Selected'
}
