const STORAGE_KEY = 'railstatistics-station-card-show-opened-on-v1'

export const STATION_CARD_SHOW_OPENED_ON_CHANGED_EVENT =
  'railstatistics-station-card-show-opened-on-changed'

const DEFAULT_SHOW_OPENED_ON = true

export function readStationCardShowOpenedOn(): boolean {
  if (typeof window === 'undefined') return DEFAULT_SHOW_OPENED_ON

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
  } catch {
    /* quota / private mode */
  }

  return DEFAULT_SHOW_OPENED_ON
}

export function writeStationCardShowOpenedOn(show: boolean): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, show ? '1' : '0')
    window.dispatchEvent(new Event(STATION_CARD_SHOW_OPENED_ON_CHANGED_EVENT))
  } catch {
    /* quota / private mode */
  }
}
