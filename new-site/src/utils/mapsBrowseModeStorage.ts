const MAPS_BROWSE_MODE_SESSION_KEY = 'railstats:mapsBrowseMode:v1'

export type MapsBrowseMode = 'view' | 'edit'

export function readMapsBrowseMode(): MapsBrowseMode {
  if (typeof window === 'undefined') return 'view'
  try {
    const raw = sessionStorage.getItem(MAPS_BROWSE_MODE_SESSION_KEY)
    return raw === 'edit' ? 'edit' : 'view'
  } catch {
    return 'view'
  }
}

export function writeMapsBrowseMode(mode: MapsBrowseMode): void {
  if (typeof window === 'undefined') return
  try {
    if (mode === 'edit') {
      sessionStorage.setItem(MAPS_BROWSE_MODE_SESSION_KEY, 'edit')
      return
    }
    sessionStorage.removeItem(MAPS_BROWSE_MODE_SESSION_KEY)
  } catch {
    /* quota / private mode */
  }
}
