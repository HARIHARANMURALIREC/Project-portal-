import * as fs from 'fs'
import XLSX from 'xlsx'

export interface ParsedMember {
  reg_no: string
  name: string
}

export interface ParsedTeam {
  batch_id: string
  team_no: number
  batch_code: string
  members: ParsedMember[]
  supervisor_name: string | null
}

export interface ParseIssue {
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

function isBlankRow(row: unknown[]): boolean {
  return row.every((c) => !String(c ?? '').trim())
}

const TEAM_CODE_RE = /^27[A-D]\d{2}$/i

export function parseBatchFile(filePath: string, batchId: string): { teams: ParsedTeam[]; issues: ParseIssue[] } {
  const issues: ParseIssue[] = []
  const teams: ParsedTeam[] = []

  if (!fs.existsSync(filePath)) {
    issues.push({ file: filePath, row: 0, message: 'File not found' })
    return { teams, issues }
  }

  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][]

  if (rows.length < 2) {
    issues.push({ file: filePath, row: 0, message: 'Sheet is empty' })
    return { teams, issues }
  }

  const headers = (rows[0] as unknown[]).map(normalizeHeader)
  const regCol = findColumn(headers, ['reg_no', 'register_no', 'registration_no', 'regno', 'reg'])
  const nameCol = findColumn(headers, ['name', 'student_name', 'studentname'])
  const batchCodeCol = findColumn(headers, ['batch_id', 'batchid', 'batch_code', 'batchcode', 'team_code'])
  const snoCol = findColumn(headers, ['s_no', 'sno', 'sl_no', 'slno', 'team_no', 'teamno'])

  if (regCol < 0 || nameCol < 0) {
    issues.push({ file: filePath, row: 1, message: `Could not find reg_no/name columns. Headers: ${headers.join(', ')}` })
    return { teams, issues }
  }

  let teamNo = 0
  let blockStartRow = 0
  let blockMembers: ParsedMember[] = []
  let blockBatchCode = ''
  let blockTeamNo: number | null = null
  let blockSupervisor: string | null = null

  function flushBlock(endRow: number) {
    if (blockMembers.length === 0) return

    teamNo++
    const batchCode =
      blockBatchCode ||
      `27${batchId}${String(blockTeamNo ?? teamNo).padStart(2, '0')}`

    if (blockMembers.length < 2) {
      issues.push({
        file: filePath,
        row: blockStartRow || endRow,
        message: `Team ${batchCode} has only ${blockMembers.length} member(s)`,
      })
    } else if (blockMembers.length > 3) {
      issues.push({
        file: filePath,
        row: blockStartRow || endRow,
        message: `Team ${batchCode} has ${blockMembers.length} members (expected 2–3)`,
      })
    }

    teams.push({
      batch_id: batchId,
      team_no: blockTeamNo ?? teamNo,
      batch_code: batchCode.toUpperCase(),
      members: blockMembers,
      supervisor_name: blockSupervisor,
    })

    blockMembers = []
    blockBatchCode = ''
    blockTeamNo = null
    blockSupervisor = null
    blockStartRow = 0
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]

    if (isBlankRow(row)) {
      flushBlock(i + 1)
      continue
    }

    const regNo = String(row[regCol] ?? '').trim()
    const name = String(row[nameCol] ?? '').trim()

    if (!regNo && !name) continue

    if (!regNo || !name) {
      issues.push({ file: filePath, row: i + 1, message: `Incomplete row: reg="${regNo}" name="${name}"` })
      continue
    }

    if (blockMembers.length === 0) {
      blockStartRow = i + 1
      const codeFromRow = batchCodeCol >= 0 ? String(row[batchCodeCol] ?? '').trim() : ''
      if (codeFromRow) blockBatchCode = codeFromRow.toUpperCase()
      if (snoCol >= 0) {
        const n = Number(row[snoCol])
        if (!Number.isNaN(n) && n > 0) blockTeamNo = n
      }
      blockSupervisor = row.length > 4 ? String(row[4] ?? '').trim() || null : null
    }

    blockMembers.push({ reg_no: regNo, name })
  }

  flushBlock(rows.length)

  return { teams, issues }
}

export function isValidTeamCode(code: string): boolean {
  return TEAM_CODE_RE.test(code.trim())
}
