import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import {
  ZEROTH_REVIEW_RUBRICS,
  ZEROTH_REVIEW_TOTAL_MAX,
  computeZerothTotal,
  fetchMarksForReview,
  fetchMarksForReviews,
  isZerothReview,
  upsertZerothMarks,
} from '@/lib/reviewMarks'
import type { TeamReview, TeamReviewMarks } from '@/types/database'

function parseScore(value: string, max: number): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  if (Number.isNaN(n) || n < 0 || n > max) return null
  return Math.round(n * 10) / 10
}

export function ZerothReviewMarksReadonly({ marks }: { marks: TeamReviewMarks | null | undefined }) {
  if (!marks) {
    return <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Marks not entered yet.</p>
  }

  return (
    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        Zeroth Review marks
      </p>
      <ul className="space-y-1 text-slate-700 dark:text-slate-200">
        {ZEROTH_REVIEW_RUBRICS.map((r) => (
          <li key={r.key} className="flex justify-between gap-3">
            <span>{r.label}</span>
            <span className="font-semibold">
              {marks[r.key]} / {r.max}
            </span>
          </li>
        ))}
        <li className="flex justify-between gap-3 border-t border-emerald-200 pt-1 font-semibold dark:border-emerald-800">
          <span>Total</span>
          <span>
            {marks.total} / {ZEROTH_REVIEW_TOTAL_MAX}
          </span>
        </li>
      </ul>
    </div>
  )
}

export function ZerothReviewMarksPanel({
  teamId,
  review,
  canEdit,
}: {
  teamId: string
  review: TeamReview
  canEdit: boolean
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const enabled = isZerothReview(review.review_title)

  const { data: marks, isLoading } = useQuery({
    queryKey: ['team-review-marks', review.id],
    queryFn: () => fetchMarksForReview(review.id),
    enabled,
  })

  const [novelty, setNovelty] = useState('')
  const [abstractContent, setAbstractContent] = useState('')
  const [sdg, setSdg] = useState('')

  useEffect(() => {
    if (!marks) return
    setNovelty(String(marks.novelty_idea))
    setAbstractContent(String(marks.abstract_content))
    setSdg(String(marks.sdg_goal_mapping))
  }, [marks])

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
      return upsertZerothMarks({
        teamReviewId: review.id,
        teamId,
        novelty_idea: noveltyN,
        abstract_content: abstractN,
        sdg_goal_mapping: sdgN,
        markedBy: user.id,
      })
    },
    onSuccess: () => {
      toast.success('Zeroth Review marks saved')
      void queryClient.invalidateQueries({ queryKey: ['team-review-marks', review.id] })
      void queryClient.invalidateQueries({ queryKey: ['team-review-marks'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save marks')
    },
  })

  if (!enabled) return null

  if (!canEdit) {
    if (isLoading) {
      return <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading marks…</p>
    }
    return <ZerothReviewMarksReadonly marks={marks} />
  }

  return (
    <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-800 dark:bg-violet-950/20">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
        Zeroth Review rubrics
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label={`Novelty Idea (max 10)`}
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={novelty}
          onChange={(e) => setNovelty(e.target.value)}
        />
        <Input
          label={`Abstract Content (max 5)`}
          type="number"
          min={0}
          max={5}
          step={0.5}
          value={abstractContent}
          onChange={(e) => setAbstractContent(e.target.value)}
        />
        <Input
          label={`SDG Goal mapping (max 10)`}
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={sdg}
          onChange={(e) => setSdg(e.target.value)}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
          {saveMutation.isPending ? 'Saving…' : marks ? 'Update marks' : 'Save marks'}
        </Button>
      </div>
    </div>
  )
}

export function useReviewMarksMap(reviewIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['team-review-marks-map', ...reviewIds],
    queryFn: async () => {
      const rows = await fetchMarksForReviews(reviewIds)
      return Object.fromEntries(rows.map((r) => [r.team_review_id, r])) as Record<string, TeamReviewMarks>
    },
    enabled: enabled && reviewIds.length > 0,
  })
}
