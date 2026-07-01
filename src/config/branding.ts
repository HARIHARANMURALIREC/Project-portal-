export const branding = {
  collegeName: 'Rajalakshmi Engineering College',
  portalTitle: 'Project Allotment Portal',
  tagline: 'Final Year Project Selection',
  logoSrc: '/college-removebg-preview.png',
  logoAlt: 'Rajalakshmi Engineering College logo',
} as const

export function getCollegeInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(of|the|and|for)$/i.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'C'
}
