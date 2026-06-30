import { useState } from 'react'
import { branding, getCollegeInitials } from '@/config/branding'

interface AppLogoProps {
  size?: 'sm' | 'lg' | 'xl'
  showCollegeName?: boolean
  showPortalTitle?: boolean
  className?: string
}

const sizeConfig = {
  sm: {
    img: 'h-10 w-auto max-w-[140px]',
    initials: 'h-10 w-10 text-sm',
    college: 'text-sm font-semibold leading-tight text-slate-900',
    portal: 'text-xs text-slate-500',
    gap: 'gap-2.5',
  },
  lg: {
    img: 'h-16 w-auto max-w-[200px]',
    initials: 'h-16 w-16 text-xl',
    college: 'text-lg font-bold leading-snug text-slate-900 sm:text-xl',
    portal: 'text-sm text-slate-600 sm:text-base',
    gap: 'gap-3',
  },
  xl: {
    img: 'h-16 w-auto max-w-[220px] sm:h-20 sm:max-w-[260px]',
    initials: 'h-16 w-16 text-xl sm:h-20 sm:w-20',
    college: 'text-lg font-bold leading-snug text-slate-900 sm:text-xl',
    portal: 'text-sm text-slate-600 sm:text-base',
    gap: 'gap-3',
  },
} as const

export function AppLogo({
  size = 'sm',
  showCollegeName = true,
  showPortalTitle = true,
  className = '',
}: AppLogoProps) {
  const [logoError, setLogoError] = useState(false)
  const cfg = sizeConfig[size]
  const initials = getCollegeInitials(branding.collegeName)

  return (
    <div className={`flex items-center ${cfg.gap} ${className}`}>
      {!logoError ? (
        <img
          src={branding.logoSrc}
          alt={branding.logoAlt}
          className={`${cfg.img} shrink-0 object-contain`}
          onError={() => setLogoError(true)}
        />
      ) : (
        <div
          className={`${cfg.initials} flex shrink-0 items-center justify-center rounded-lg bg-slate-200 font-bold text-slate-600`}
          aria-hidden
        >
          {initials}
        </div>
      )}
      {(showCollegeName || showPortalTitle) && (
        <div className="min-w-0">
          {showCollegeName && (
            <p className={`${cfg.college} truncate`}>{branding.collegeName}</p>
          )}
          {showPortalTitle && (
            <p className={`${cfg.portal} truncate`}>{branding.portalTitle}</p>
          )}
        </div>
      )}
    </div>
  )
}
