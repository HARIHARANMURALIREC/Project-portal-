const MATRIX_COLUMNS = [
  { chars: '101TEAM', left: '0%', delay: '0s', duration: '1.8s' },
  { chars: '010OG01', left: '14%', delay: '0.3s', duration: '2.1s' },
  { chars: 'TEAM101', left: '28%', delay: '0.15s', duration: '1.6s' },
  { chars: 'OG01010', left: '42%', delay: '0.45s', duration: '2.3s' },
  { chars: '110TEAM', left: '56%', delay: '0.1s', duration: '1.9s' },
  { chars: '001OG11', left: '70%', delay: '0.55s', duration: '2s' },
  { chars: 'TEAM010', left: '84%', delay: '0.25s', duration: '1.7s' },
  { chars: '101OG01', left: '96%', delay: '0.4s', duration: '2.2s' },
] as const

export function TeamOgFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`px-6 py-6 text-center ${className}`}>
      <p className="flex flex-wrap items-baseline justify-center gap-x-1 text-sm text-slate-500 dark:text-slate-400">
        <span>Developed with</span>
        <span className="heart-rgb" aria-label="love">
          ♥
        </span>
        <span className="team-og-brand relative inline-flex cursor-default items-baseline">
          <span className="team-og-matrix" aria-hidden>
            {MATRIX_COLUMNS.map((col) => (
              <span
                key={col.left}
                className="team-og-matrix-col"
                style={{
                  left: col.left,
                  animationDelay: col.delay,
                  animationDuration: col.duration,
                }}
              >
                {col.chars.split('').join('\n')}
              </span>
            ))}
          </span>
          <span className="team-og-text font-semibold">TEAM OG</span>
        </span>
      </p>
    </footer>
  )
}
