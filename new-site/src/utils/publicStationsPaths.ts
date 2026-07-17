/**
 * Shared pathname helpers for public stations routes (list vs detail vs map).
 */

/** Exact public stations browse list. */
export function isPublicStationsListPath(pathname: string): boolean {
  return pathname === '/stations'
}

/**
 * Public station detail: `/stations/{network}/{slug}`
 * Excludes list, map, and edit redirects.
 */
export function isPublicStationDetailPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'stations') return false
  if (parts.length !== 3) return false
  if (parts[1] === 'map') return false
  return true
}

/** Public list or detail — cold visitors should not load Auth/App Check/gtag. */
export function isPublicStationsBrowsePath(pathname: string): boolean {
  return isPublicStationsListPath(pathname) || isPublicStationDetailPath(pathname)
}
