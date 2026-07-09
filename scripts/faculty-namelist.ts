import * as fs from 'fs'
import * as path from 'path'
import XLSX from 'xlsx'

export interface FacultyRow {
  name: string
  email: string
  designation: string
}

const DEFAULT_NAMELIST = path.resolve(process.cwd(), 'data/Faculty Namelist.xlsx')

/** Normalize supervisor/faculty names for fuzzy matching (title, spacing, punctuation). */
export function normalizeSupervisorKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^(mrs|mr|ms|dr|prof)\.?\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z]/g, '')
}

function normalizeFacultyEmail(email: string): string {
  let e = email.trim().toLowerCase()
  if (e.endsWith('@rajalakshmi.edu') && !e.endsWith('@rajalakshmi.edu.in')) {
    e += '.in'
  }
  return e
}

export function parseFacultyNamelist(filePath: string = DEFAULT_NAMELIST): FacultyRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Faculty namelist not found: ${filePath}`)
  }

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

  return rows
    .map((row) => ({
      name: String(row.Name ?? row.name ?? '').trim(),
      email: normalizeFacultyEmail(String(row.Mail_id ?? row.mail_id ?? row.Email ?? '')),
      designation: String(row.Designation ?? row.designation ?? '').trim(),
    }))
    .filter((row) => row.name && row.email.includes('@'))
}

export function buildFacultyLookup(rows: FacultyRow[]): Map<string, FacultyRow> {
  const map = new Map<string, FacultyRow>()
  for (const row of rows) {
    map.set(normalizeSupervisorKey(row.name), row)
  }
  return map
}

export function lookupFacultyForSupervisor(
  supervisorName: string,
  lookup: Map<string, FacultyRow>,
): FacultyRow | null {
  return lookup.get(normalizeSupervisorKey(supervisorName)) ?? null
}
