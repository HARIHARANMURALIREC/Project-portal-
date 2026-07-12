import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { sortTeamMembers } from '@/lib/teamSort'
import {
  ZEROTH_REVIEW_RUBRICS,
  ZEROTH_REVIEW_TOTAL_MAX,
  computeZerothTotal,
  fetchStudentMarksForReview,
  fetchStudentMarksForReviews,
  indexStudentMarks,
  isZerothReview,
  marksKey,
  upsertStudentZerothMarks,
} from '@/lib/reviewMarks'
import type { ReviewMarkerRole, StudentReviewMarks, TeamReview } from '@/types/database'

type MarkableMember = { id: string; reg_no: string; name: string }

function parseScore(value: string, max: number): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  if (Number.isNaN(n) || n < 0 || n > max) return null
  return Math.round(n * 10) / 10
}

function roleLabel(role: ReviewMarkerRole): string {
  return role === 'supervisor' ? 'Supervisor' : 'Reviewer'
}

export function StudentMarksReadonly({
  marks,
  label,
}: {
  marks: StudentReviewMarks | null | undefined
  label: string
}) {
  if (!marks) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{label}: not entered</p>
  }

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-2 text-xs dark:border-emerald-800 dark:bg-emerald-950/30">
      <p className="mb-1 font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{label}</p>
      <ul className="space-y-0.5 text-slate-700 dark:text-slate-200">
        {ZEROTH_REVIEW_RUBRICS.map((r) => (
          <li key={r.key} className="flex justify-between gap-2">
            <span>{r.label}</span>
            <span className="font-semibold">
              {marks[r.key]}/{r.max}
            </span>
          </li>
        ))}
        <li className="flex justify-between gap-2 border-t border-emerald-200 pt-0.5 font-semibold dark:border-emerald-800">
          <span>Total</span>
          <span>
            {marks.total}/{ZEROTH_REVIEW_TOTAL_MAX}
          </span>
        </li>
      </ul>
    </div>
  )
}

function MemberMarkRow({
  member,
  existing,
  canEdit,
  role,
  teamId,
  reviewId,
}: {
  member: MarkableMember
  existing: StudentReviewMarks | null | undefined
  canEdit: boolean
  role: ReviewMarkerRole
  teamId: string
  reviewId: string
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [novelty, setNovelty] = useState('')
  const [abstractContent, setAbstractContent] = useState('')
  const [sdg, setSdg] = useState('')

  useEffect(() => {
    if (!existing) {
      setNovelty('')
      setAbstractContent('')
      setSdg('')
      return
    }
    setNovelty(String(existing.novelty_idea))
    setAbstractContent(String(existing.abstract_content))
    setSdg(String(existing.sdg_goal_mapping))
  }, [existing])

  const noveltyN = parseScore(novelty, 10)
  const abstractN = parseScore(abstractContent, 5)
  const sdgN = parseScore(sdg, 10)
  const liveTotal =
    noveltyN != null && abstractN != null && sdgN != null
      ? computeZerothTotal({
          novelty_idea: noveltyN,
          abstract_content: abstractN,
          sdg_goal_mapping: sdgN,
        })
      : null

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in')
      if (noveltyN == null) throw new Error('Novelty Idea must be 0–10')
      if (abstractN == null) throw new Error('Abstract Content must be 0–5')
      if (sdgN == null) throw new Error('SDG Goal mapping must be 0–10')
      return upsertStudentZerothMarks({
        teamReviewId: reviewId,
        teamId,
        teamMemberId: member.id,
        role,
        novelty_idea: noveltyN,
        abstract_content: abstractN,
        sdg_goal_mapping: sdgN,
        markedBy: user.id,
      })
    },
    onSuccess: () => {
      toast.success(`Marks saved for ${member.name}`)
      void queryClient.invalidateQueries({ queryKey: ['student-review-marks', reviewId] })
      void queryClient.invalidateQueries({ queryKey: ['student-review-marks'] })
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
        <StudentMarksReadonly marks={existing} label={roleLabel(role)} />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-800 dark:bg-violet-950/20">
      <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {member.name}{' '}
        <span className="font-mono text-xs font-normal text-slate-500">{member.reg_no}</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          label="Novelty (max 10)"
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={novelty}
          onChange={(e) => setNovelty(e.target.value)}
        />
        <Input
          label="Abstract (max 5)"
          type="number"
          min={0}
          max={5}
          step={0.5}
          value={abstractContent}
          onChange={(e) => setAbstractContent(e.target.value)}
        />
        <Input
          label="SDG (max 10)"
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={sdg}
          onChange={(e) => setSdg(e.target.value)}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Total:{' '}
          {liveTotal != null ? (
            <span>
              {liveTotal} / {ZEROTH_REVIEW_TOTAL_MAX}
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

/** Editable or readonly per-student marks for one marker role. */
export function ZerothReviewMarksPanel({
  teamId,
  review,
  members,
  markerRole,
  canEdit,
  showBothRoles = false,
}: {
  teamId: string
  review: TeamReview
  members: MarkableMember[]
  markerRole: ReviewMarkerRole
  canEdit: boolean
  /** When true (coordinator views), show supervisor + reviewer side by side per student. */
  showBothRoles?: boolean
}) {
  const enabled = isZerothReview(review.review_title)
  const sorted = useMemo(() => sortTeamMembers(members), [members])

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['student-review-marks', review.id],
    queryFn: () => fetchStudentMarksForReview(review.id),
    enabled,
  })

  const byKey = useMemo(() => indexStudentMarks(rows), [rows])

  if (!enabled) return null

  if (isLoading) {
    return <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading marks…</p>
  }

  if (sorted.length === 0) {
    return <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No team members found.</p>
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
        Zeroth Review marks {showBothRoles ? '(supervisor & reviewer)' : `(${roleLabel(markerRole)})`} — per student
      </p>
      {sorted.map((member) => {
        if (showBothRoles) {
          const sup = byKey[marksKey(member.id, 'supervisor')]
          const rev = byKey[marksKey(member.id, 'reviewer')]
          return (
            <div
              key={member.id}
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-app-surface"
            >
              <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {member.name}{' '}
                <span className="font-mono text-xs font-normal text-slate-500">{member.reg_no}</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <StudentMarksReadonly marks={sup} label="Supervisor" />
                <StudentMarksReadonly marks={rev} label="Reviewer" />
              </div>
            </div>
          )
        }

        return (
          <MemberMarkRow
            key={member.id}
            member={member}
            existing={byKey[marksKey(member.id, markerRole)]}
            canEdit={canEdit}
            role={markerRole}
            teamId={teamId}
            reviewId={review.id}
          />
        )
      })}
    </div>
  )
}

/** Map reviewId → student marks rows (for coordinator summaries). */
export function useStudentReviewMarksMap(reviewIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['student-review-marks-map', ...reviewIds],
    queryFn: () => fetchStudentMarksForReviews(reviewIds),
    enabled: enabled && reviewIds.length > 0,
  })
}
