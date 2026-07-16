/**
 * Canonical domain labels — maps known duplicates/typos from the Excel sheet.
 * Keys must match the source string exactly (after trim).
 */
export const DOMAIN_ALIASES: Record<string, string> = {
  'Cyber Security': 'Cybersecurity',
  'Cyber security': 'Cybersecurity',
  'Mchine Learning': 'Machine Learning',
  'Network Secuirty/ Cloud Computing': 'Network Security / Cloud Computing',
  'Gen AI': 'Generative AI',
  'AI & IOT': 'AI & IoT',
}

export function normalizeDomain(domain: string | null | undefined): string | null {
  if (!domain) return null
  const trimmed = domain.trim()
  if (!trimmed) return null
  return DOMAIN_ALIASES[trimmed] ?? trimmed
}
