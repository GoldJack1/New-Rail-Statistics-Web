/** The 33 local authority areas in Greater London (32 boroughs + City of London). */
export const LONDON_BOROUGH_NAMES = [
  'Barking and Dagenham',
  'Barnet',
  'Bexley',
  'Brent',
  'Bromley',
  'Camden',
  'City of London',
  'Croydon',
  'Ealing',
  'Enfield',
  'Greenwich',
  'Hackney',
  'Hammersmith and Fulham',
  'Haringey',
  'Harrow',
  'Havering',
  'Hillingdon',
  'Hounslow',
  'Islington',
  'Kensington and Chelsea',
  'Kingston upon Thames',
  'Lambeth',
  'Lewisham',
  'Merton',
  'Newham',
  'Redbridge',
  'Richmond upon Thames',
  'Southwark',
  'Sutton',
  'Tower Hamlets',
  'Waltham Forest',
  'Wandsworth',
  'Westminster',
] as const

const LONDON_BOROUGH_KEY_LOOKUP = new Map<string, string>()

for (const name of LONDON_BOROUGH_NAMES) {
  LONDON_BOROUGH_KEY_LOOKUP.set(normalizeLondonBoroughKey(name), name)
}

/** Normalizes borough labels for comparison (case, hyphens, spacing). */
export function normalizeLondonBoroughKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\u2013/g, '-')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
}

/** True when a DDM value is one of the 33 London boroughs (not a combined locality label). */
export function isLondonBoroughOption(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.includes(' & ')) return false
  return LONDON_BOROUGH_KEY_LOOKUP.has(normalizeLondonBoroughKey(trimmed))
}

/** Borough filter options derived from station data — canonical London boroughs only. */
export function getLondonBoroughOptions(allBoroughs: string[]): string[] {
  return allBoroughs.filter(isLondonBoroughOption)
}

/** Splits combined locality labels such as "Greenwich & Bexley" for station matching. */
export function expandLondonBoroughField(value: string | null | undefined): string[] {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return []
  if (!trimmed.includes(' & ')) return [trimmed]
  return trimmed
    .split(' & ')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function boroughLabelMatchesSelection(
  boroughLabel: string,
  selectedBoroughs: readonly string[]
): boolean {
  if (selectedBoroughs.includes(boroughLabel)) return true

  const selectedKeys = new Set(selectedBoroughs.map(normalizeLondonBoroughKey))
  return expandLondonBoroughField(boroughLabel).some((part) =>
    selectedKeys.has(normalizeLondonBoroughKey(part))
  )
}
