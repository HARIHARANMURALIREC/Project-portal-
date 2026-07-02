import * as fs from 'fs'
import XLSX from 'xlsx'

export interface ParsedEmailRow {
  batch_code: string | null
  email: string
  name: string
  reg_no: string
}

export interface ParseEmailIssue {
  file: string
  row: number
  message: string
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c)
    if (idx >= 0) return idx
  }
  return -1
}

/** College email local part → portal reg_no (2116 + local). */
export function emailToRegNo(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.indexOf('@')
  if (at <= 0) return null
  const local = trimmed.slice(0, at)
  if (!local) return null
  return `2116${local}`
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((c) => !String(c ?? '').trim())
}

export function parseEmailFile(filePath: string): { rows: ParsedEmailRow[]; issues: ParseEmailIssue[] } {
  const issues: ParseEmailIssue[] = []
  const rows: ParsedEmailRow[] = []

  if (!fs.existsSync(filePath)) {
    issues.push({ file: filePath, row: 0, message: 'File not found' })
    return { rows, issues }
  }

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][]

  if (sheetRows.length < 2) {
    issues.push({ file: filePath, row: 0, message: 'Sheet is empty' })
    return { rows, issues }
  }

  const headers = (sheetRows[0] as unknown[]).map(normalizeHeader)
  const emailCol = findColumn(headers, ['email', 'email_id', 'emailid', 'mail'])
  const nameCol = findColumn(headers, ['name', 'student_name', 'studentname'])
  const batchCol = findColumn(headers, ['batch_id', 'batchid', 'batch_code', 'batchcode', 'team_code'])

  if (emailCol < 0) {
    issues.push({ file: filePath, row: 1, message: `Could not find email column. Headers: ${headers.join(', ')}` })
    return { rows, issues }
  }

  let currentBatchCode: string | null = null

  for (let i = 1; i < sheetRows.length; i++) {
    const row = sheetRows[i] as unknown[]
    if (isBlankRow(row)) continue

    const email = String(row[emailCol] ?? '').trim().toLowerCase()
    const name = nameCol >= 0 ? String(row[nameCol] ?? '').trim() : ''
    const batchFromRow = batchCol >= 0 ? String(row[batchCol] ?? '').trim().toUpperCase() : ''

    if (batchFromRow) currentBatchCode = batchFromRow

    if (!email) {
      if (name) {
        issues.push({ file: filePath, row: i + 1, message: `Missing email for "${name}"` })
      }
      continue
    }

    const reg_no = emailToRegNo(email)
    if (!reg_no) {
      issues.push({ file: filePath, row: i + 1, message: `Invalid email: ${email}` })
      continue
    }

    rows.push({
      batch_code: currentBatchCode,
      email,
      name,
      reg_no,
    })
  }

  return { rows, issues }
}
