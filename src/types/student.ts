import type { Batch, Project, Team, TeamMember } from '@/types/database'

export interface TeamMemberFields {
  id?: string
  name: string
  roll_no: string
  department: string
  year: string
  semester: string
  section: string
}

export interface StudentContext {
  team: Team
  members: TeamMember[]
  batch: Batch
  selectedProject: Project | null
  selectionBlocked: boolean
}

export type StudentNavKey = 'dashboard' | 'topics' | 'project' | 'reviews' | 'profile'
