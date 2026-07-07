/**
 * Use the same-origin `/api/osm-tile/{s}/{z}/{x}/{y}.png` Route Handler
 * instead of hitting tile.openstreetmap.org directly from the browser.
 * Strict CSPs (e.g. img-src 'self' data:) and embedded browsers still allow this.
 *
 * - Production builds: on by default.
 * - Opt out: NEXT_PUBLIC_USE_OSM_PROXY=false (e.g. static export without the route handler).
 * - Dev server: off unless NEXT_PUBLIC_USE_OSM_PROXY=true.
 */
export function shouldUseOsmBackendProxy(): boolean {
  const flag = process.env.NEXT_PUBLIC_USE_OSM_PROXY
  if (flag === 'false') return false
  if (flag === 'true') return true
  return process.env.NODE_ENV === 'production'
}

/** Hook-shaped alias used by `LocationMapPicker` and other map components ported from the old site. */
export function useOsmBackendProxy(): boolean {
  return shouldUseOsmBackendProxy()
}
