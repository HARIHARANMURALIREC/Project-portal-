export type UserRole = 'admin' | 'teacher' | 'student'

export interface Profile {
  id: string
  role: UserRole
  reg_no: string | null
  supervisor_name: string | null
  full_name: string | null
  password_changed_at?: string | null
}

export interface SupervisorLoginStatus {
  id: string
  full_name: string | null
  supervisor_name: string | null
  email: string
  last_sign_in_at: string | null
  password_changed_at: string | null
  has_logged_in: boolean
  password_changed: boolean
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
  reviewer_name: string | null
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
  team_reviews?: TeamReview[]
}

export interface TeamReview {
  id: string
  team_id: string
  review_title: string
  scheduled_at: string
  completed_at: string | null
  completed_by: string | null
  remarks: string | null
  reviewer_remarks: string | null
  reviewer_remarks_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  schedule_group_id?: string | null
}

export interface ReviewScheduleSummary {
  schedule_group_id: string
  review_title: string
  scheduled_at: string
  remarks: string | null
  teams_count: number
  completed_count: number
  created_at: string
}

export type ReviewFileType = 'pdf' | 'ppt'

export interface TeamReviewFile {
  id: string
  team_id: string
  team_review_id: string
  file_type: ReviewFileType
  storage_path: string
  original_filename: string
  uploaded_by: string
  created_at: string
  updated_at: string
}

export type ReviewMarkerRole = 'supervisor' | 'reviewer'

export interface StudentReviewMarks {
  id: string
  team_review_id: string
  team_id: string
  team_member_id: string
  role: ReviewMarkerRole
  novelty_idea: number
  abstract_content: number
  sdg_goal_mapping: number
  total: number
  marked_by: string
  created_at: string
  updated_at: string
}

/** @deprecated Use StudentReviewMarks — kept temporarily for type migrations */
export type TeamReviewMarks = StudentReviewMarks

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

export interface StudentAttendance {
  id: string
  student_id: string
  team_id: string
  attendance_date: string
  status: 'present' | 'absent'
  marked_by: string
  created_at: string
  updated_at: string
}
