import type { NewStationNavigationState } from '@/types/newStationNavigation'

const NEW_STATION_KEY = 'railstats:newStationNav'
const STATION_DETAILS_KEY = 'railstats:stationDetailsNav'

export function setNewStationNavigationState(state: NewStationNavigationState): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(NEW_STATION_KEY, JSON.stringify(state))
}

export function readNewStationNavigationState(): NewStationNavigationState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(NEW_STATION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as NewStationNavigationState
  } catch {
    return null
  }
}

export function clearNewStationNavigationState(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(NEW_STATION_KEY)
}

export function setStationDetailsNavigationState(state: unknown): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STATION_DETAILS_KEY, JSON.stringify(state ?? null))
}

export function readStationDetailsNavigationState(): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STATION_DETAILS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
