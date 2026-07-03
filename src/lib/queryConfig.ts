/** Polling intervals (ms) — used instead of Realtime on student views to reduce Free tier load. */
export const POLL_INTERVALS = {
  /** Team + portal settings while logged in as student */
  studentContext: 15_000,
  /** Project list on Available Topics during selection */
  projectsList: 5_000,
  /** Admin dashboard tables */
  adminData: 10_000,
  /** Portal open/closed status */
  portalStatus: 15_000,
} as const
