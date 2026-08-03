/** Shared empty-map camera — kept Leaflet-free so SSR modules can import it safely. */

export const STATIONS_MAP_EMPTY_CENTER: [number, number] = [54.5, -2.5]

/** Distinct from real country-scale fits (GB NR often lands near zoom 5–6). */
export const STATIONS_MAP_EMPTY_ZOOM = 3

/**
 * True for the empty UK fallback and near-misses after Leaflet invalidateSize
 * (float drift). These must never be session-restored or treated as user cameras.
 */
export function isNearEmptyDefaultMapView(view: {
  lat: number
  lng: number
  zoom: number
}): boolean {
  return (
    Math.abs(view.lat - STATIONS_MAP_EMPTY_CENTER[0]) < 0.2 &&
    Math.abs(view.lng - STATIONS_MAP_EMPTY_CENTER[1]) < 0.2 &&
    view.zoom <= STATIONS_MAP_EMPTY_ZOOM + 1.5
  )
}
