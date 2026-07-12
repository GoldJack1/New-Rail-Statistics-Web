export type StationAdminDisplayMode = 'cards' | 'table'

const STATION_ADMIN_DISPLAY_MODE_STORAGE_KEY = 'railstatistics-station-admin-display-mode-v1'
export const STATION_ADMIN_DISPLAY_MODE_COOKIE = 'rs-station-display-mode'

export const STATION_ADMIN_DISPLAY_MODE_CHANGED_EVENT =
  'railstatistics-station-admin-display-mode-changed'

function readDisplayModeCookie(): StationAdminDisplayMode | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${STATION_ADMIN_DISPLAY_MODE_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`)
  )
  const value = match?.[1]
  if (value === 'table' || value === 'cards') return value
  return null
}

function syncDisplayModeCookie(mode: StationAdminDisplayMode): void {
  if (typeof document === 'undefined') return
  document.cookie = `${STATION_ADMIN_DISPLAY_MODE_COOKIE}=${mode}; path=/; max-age=31536000; SameSite=Lax`
}

export function readStationAdminDisplayModeFromCookieHeader(
  cookieHeader: string | null | undefined
): StationAdminDisplayMode {
  if (!cookieHeader) return 'cards'
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${STATION_ADMIN_DISPLAY_MODE_COOKIE}=([^;]*)`)
  )
  return match?.[1] === 'table' ? 'table' : 'cards'
}

export function readStationAdminDisplayMode(): StationAdminDisplayMode {
  if (typeof window === 'undefined') return 'cards'

  try {
    const stored = localStorage.getItem(STATION_ADMIN_DISPLAY_MODE_STORAGE_KEY)
    if (stored === 'table' || stored === 'cards') {
      syncDisplayModeCookie(stored)
      return stored
    }
  } catch {
    /* quota / private mode */
  }

  const fromCookie = readDisplayModeCookie()
  if (fromCookie) {
    try {
      localStorage.setItem(STATION_ADMIN_DISPLAY_MODE_STORAGE_KEY, fromCookie)
    } catch {
      /* quota / private mode */
    }
    return fromCookie
  }

  return 'cards'
}

export function writeStationAdminDisplayMode(mode: StationAdminDisplayMode): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STATION_ADMIN_DISPLAY_MODE_STORAGE_KEY, mode)
    syncDisplayModeCookie(mode)
    window.dispatchEvent(new Event(STATION_ADMIN_DISPLAY_MODE_CHANGED_EVENT))
  } catch {
    /* quota / private mode */
  }
}
