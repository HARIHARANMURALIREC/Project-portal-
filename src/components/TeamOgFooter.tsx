export function TeamOgFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`px-6 py-6 text-center ${className}`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Developed with <span className="heart-rgb" aria-label="love">♥</span> TEAM OG
      </p>
    </footer>
  )
}
