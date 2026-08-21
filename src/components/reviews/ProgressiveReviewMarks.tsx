import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { sortTeamMembers } from '@/lib/teamSort'
import {
  PROGRESSIVE_REVIEW_RUBRICS,
  PROGRESSIVE_REVIEW_TOTAL_MAX,
  computeProgressiveTotal,
  emptyProgressiveScores,
  fetchProgressiveMarksForReview,
  indexProgressiveMarks,
  lookupMarksForRole,
  upsertStudentProgressiveMarks,
  type ProgressiveRubricKey,
} from '@/lib/reviewMarks'
import type {
  ReviewMarkerRole,
  StudentProgressiveReviewMarks,
  TeamReview,
} from '@/types/database'

type MarkableMember = { id: string; reg_no: string; name: string }

function parseScore(value: string, max: number): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  if (Number.isNaN(n) || n < 0 || n > max) return null
  return Math.round(n * 10) / 10
}

function MemberProgressiveMarkRow({
  member,
  existing,
  canEdit,
  role,
  teamId,
  reviewId,
}: {
  member: MarkableMember
  existing: StudentProgressiveReviewMarks | null | undefined
  canEdit: boolean
  role: ReviewMarkerRole
  teamId: string
  reviewId: string
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [values, setValues] = useState(emptyProgressiveScores)

  useEffect(() => {
    if (!existing) {
      setValues(emptyProgressiveScores())
      return
    }
    setValues({
      feasibility: String(existing.feasibility),
      proposed_methodology: String(existing.proposed_methodology),
      background: String(existing.background),
      literature_survey: String(existing.literature_survey),
      reference_paper: String(existing.reference_paper),
    })
  }, [existing])

  const parsed = Object.fromEntries(
    PROGRESSIVE_REVIEW_RUBRICS.map((r) => [r.key, parseScore(values[r.key], r.max)]),
  ) as Record<ProgressiveRubricKey, number | null>

  const allFilled = PROGRESSIVE_REVIEW_RUBRICS.every((r) => parsed[r.key] != null)
  const liveTotal = allFilled
    ? computeProgressiveTotal(
        Object.fromEntries(PROGRESSIVE_REVIEW_RUBRICS.map((r) => [r.key, parsed[r.key]!])) as Record<
          ProgressiveRubricKey,
          number
        >,
      )
    : null

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in')
      for (const rubric of PROGRESSIVE_REVIEW_RUBRICS) {
        if (parsed[rubric.key] == null) {
          throw new Error(`${rubric.label} must be 0–${rubric.max}`)
        }
      }
      return upsertStudentProgressiveMarks({
        teamReviewId: reviewId,
        teamId,
        teamMemberId: member.id,
        role,
        feasibility: parsed.feasibility!,
        proposed_methodology: parsed.proposed_methodology!,
        background: parsed.background!,
        literature_survey: parsed.literature_survey!,
        reference_paper: parsed.reference_paper!,
        markedBy: user.id,
      })
    },
    onSuccess: () => {
      toast.success(`Marks saved for ${member.name}`)
      void queryClient.invalidateQueries({ queryKey: ['student-progressive-marks', reviewId] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save marks')
    },
  })

  if (!canEdit) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-app-surface">
        <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {member.name}{' '}
          <span className="font-mono text-xs font-normal text-slate-500">{member.reg_no}</span>
        </p>
        {!existing ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Marks not entered</p>
        ) : (
          <ul className="space-y-0.5 text-xs text-slate-700 dark:text-slate-200">
            {PROGRESSIVE_REVIEW_RUBRICS.map((r) => (
              <li key={r.key} className="flex justify-between gap-2">
                <span>{r.label}</span>
                <span className="font-semibold">
                  {existing[r.key]}/{r.max}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-2 border-t border-slate-200 pt-0.5 font-semibold dark:border-slate-600">
              <span>Total</span>
              <span>
                {existing.total}/{PROGRESSIVE_REVIEW_TOTAL_MAX}
              </span>
            </li>
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-800 dark:bg-violet-950/20">
      <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {member.name}{' '}
        <span className="font-mono text-xs font-normal text-slate-500">{member.reg_no}</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {PROGRESSIVE_REVIEW_RUBRICS.map((rubric) => (
          <Input
            key={rubric.key}
            label={`${rubric.label} (max ${rubric.max})`}
            type="number"
            min={0}
            max={rubric.max}
            step={0.5}
            value={values[rubric.key]}
            onChange={(e) => setValues((prev) => ({ ...prev, [rubric.key]: e.target.value }))}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Total:{' '}
          {liveTotal != null ? (
            <span>
              {liveTotal} / {PROGRESSIVE_REVIEW_TOTAL_MAX}
            </span>
          ) : (
            <span className="font-normal text-slate-500">enter all scores</span>
          )}
        </p>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || liveTotal == null}
        >
          {saveMutation.isPending ? 'Saving…' : existing ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

/** Editable per-student marks for 1st / 2nd / 3rd reviews. */
export function ProgressiveReviewMarksPanel({
  teamId,
  review,
  members,
  markerRole,
  canEdit,
}: {
  teamId: string
  review: TeamReview
  members: MarkableMember[]
  markerRole: ReviewMarkerRole
  canEdit: boolean
}) {
  const sorted = useMemo(() => sortTeamMembers(members), [members])

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['student-progressive-marks', review.id],
    queryFn: () => fetchProgressiveMarksForReview(review.id),
  })

  const byKey = useMemo(() => indexProgressiveMarks(rows), [rows])

  if (isLoading) {
    return <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading marks…</p>
  }

  if (sorted.length === 0) {
    return <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No team members found.</p>
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
        Review marks (reviewer) — Feasibility, Proposed Methodology, Background, Literature Survey,
        Reference Paper (max 10 each)
      </p>
      {sorted.map((member) => (
        <MemberProgressiveMarkRow
          key={member.id}
          member={member}
          existing={lookupMarksForRole(byKey, member.id, markerRole)}
          canEdit={canEdit}
          role={markerRole}
          teamId={teamId}
          reviewId={review.id}
        />
      ))}
    </div>
  )
}
