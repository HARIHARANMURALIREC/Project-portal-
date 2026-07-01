import type { TeamMember } from '@/types/database'
import type { TeamMemberFields } from '@/types/student'

export const STUDENT_DEPARTMENT = 'IT'
export const STUDENT_YEAR = '4th Year'
export const STUDENT_SEMESTER = '7th Semester'

export interface StudentAcademicInfo {
  department: string
  section: string
  year: string
  semester: string
}

export function getStudentAcademicInfo(batchId: string): StudentAcademicInfo {
  return {
    department: STUDENT_DEPARTMENT,
    section: batchId.toUpperCase(),
    year: STUDENT_YEAR,
    semester: STUDENT_SEMESTER,
  }
}

const emptyMember = (): TeamMemberFields => ({
  name: '',
  roll_no: '',
  department: STUDENT_DEPARTMENT,
  year: STUDENT_YEAR,
  semester: STUDENT_SEMESTER,
  section: '',
})

export function memberToFields(
  member: TeamMember | undefined,
  academic: StudentAcademicInfo,
): TeamMemberFields {
  if (!member) return { ...emptyMember(), section: academic.section }

  return {
    id: member.id,
    name: member.name ?? '',
    roll_no: member.reg_no ?? '',
    department: academic.department,
    year: academic.year,
    semester: academic.semester,
    section: academic.section,
  }
}

export function getTeamMembersForForm(
  members: TeamMember[],
  batchId: string,
): [TeamMemberFields, TeamMemberFields] {
  const academic = getStudentAcademicInfo(batchId)
  const sorted = [...members].sort((a, b) => a.reg_no.localeCompare(b.reg_no))
  return [
    memberToFields(sorted[0], academic),
    memberToFields(sorted[1], academic),
  ]
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}…`
}
