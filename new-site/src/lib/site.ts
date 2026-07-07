/** Canonical public site URL (no trailing slash). Override via Netlify env. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://railstatistics.co.uk'
).trim()

export const SITE_NAME = 'Rail Statistics'

export const SITE_DESCRIPTION =
  'Rail Statistics — track your railway station visits, explore live departures, and manage station data.'

export const SITE_KEYWORDS = ['rail', 'statistics', 'railway', 'stations', 'tracking', 'train']
