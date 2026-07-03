export type UserRole = 'admin' | 'teacher' | 'student'

export interface Profile {
  id: string
  role: UserRole
  reg_no: string | null
  supervisor_name: string | null
  full_name: string | null
}

export interface Batch {
  id: string
  name: string
  is_open: boolean
  opened_at: string | null
  closed_at: string | null
}

export interface Project {
  id: string
  s_no: number | null
  domain: string | null
  title: string
  abstract: string | null
  status: 'open' | 'locked'
  locked_by_team_id: string | null
  locked_at: string | null
}

export interface Team {
  id: string
  batch_id: string
  team_no: number
  batch_code: string
  supervisor_name: string | null
  selected_project_id: string | null
  locked_by_user_id: string | null
  locked_at: string | null
  teacher_comments: string | null
  selection_blocked: boolean
}

export interface TeamMember {
  id: string
  team_id: string
  reg_no: string
  name: string
  user_id: string | null
  email?: string | null
  department?: string | null
  year?: string | null
  semester?: string | null
  section?: string | null
}

export interface TeamWithDetails extends Team {
  team_members: TeamMember[]
  projects: Project | null
  batches: Batch | null
}

export interface ClaimProjectResult {
  success: boolean
  message: string
}

export interface PortalSettings {
  id: number
  portal_open: boolean
  selection_blocked: boolean
  updated_at: string
}
