const MAPS_SELECTED_STATION_SESSION_KEY = 'railstats:mapsSelectedStation:v1'

export function readMapsSelectedStationKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(MAPS_SELECTED_STATION_SESSION_KEY)
    if (!raw) return null
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}

export function writeMapsSelectedStationKey(stationKey: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (!stationKey) {
      sessionStorage.removeItem(MAPS_SELECTED_STATION_SESSION_KEY)
      return
    }
    sessionStorage.setItem(MAPS_SELECTED_STATION_SESSION_KEY, stationKey)
  } catch {
    /* quota / private mode */
  }
}
