export type StationAdminSidebarSectionId = 'search' | 'view' | 'sort' | 'filters' | 'admin'

export const STATION_ADMIN_SIDEBAR_SECTION_IDS: StationAdminSidebarSectionId[] = [
  'search',
  'view',
  'sort',
  'filters',
  'admin',
]

export type StationAdminSidebarSectionsState = Record<StationAdminSidebarSectionId, boolean>

export const DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS: StationAdminSidebarSectionsState = {
  search: true,
  view: true,
  sort: false,
  filters: false,
  admin: false,
}

const STATION_ADMIN_SIDEBAR_SECTIONS_STORAGE_KEY =
  'railstatistics-station-admin-sidebar-sections-v1'
export const STATION_ADMIN_SIDEBAR_SECTIONS_COOKIE = 'rs-station-sidebar-sections'

export const STATION_ADMIN_SIDEBAR_SECTIONS_CHANGED_EVENT =
  'railstatistics-station-admin-sidebar-sections-changed'

function encodeSidebarSections(sections: StationAdminSidebarSectionsState): string {
  return STATION_ADMIN_SIDEBAR_SECTION_IDS.map((id) => (sections[id] ? '1' : '0')).join('')
}

function decodeSidebarSections(
  encoded: string | undefined
): StationAdminSidebarSectionsState | null {
  if (encoded == null || encoded.length !== STATION_ADMIN_SIDEBAR_SECTION_IDS.length) {
    return null
  }
  if (!/^[01]+$/.test(encoded)) return null

  return STATION_ADMIN_SIDEBAR_SECTION_IDS.reduce<StationAdminSidebarSectionsState>(
    (acc, id, index) => {
      acc[id] = encoded[index] === '1'
      return acc
    },
    { ...DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS }
  )
}

function mergeSidebarSections(
  partial: Partial<StationAdminSidebarSectionsState> | null | undefined
): StationAdminSidebarSectionsState {
  return {
    ...DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS,
    ...partial,
  }
}

function readSidebarSectionsCookie(): StationAdminSidebarSectionsState | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${STATION_ADMIN_SIDEBAR_SECTIONS_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`
    )
  )
  return decodeSidebarSections(match?.[1])
}

function syncSidebarSectionsCookie(sections: StationAdminSidebarSectionsState): void {
  if (typeof document === 'undefined') return
  document.cookie = `${STATION_ADMIN_SIDEBAR_SECTIONS_COOKIE}=${encodeSidebarSections(sections)}; path=/; max-age=31536000; SameSite=Lax`
}

export function readStationAdminSidebarSectionsFromCookie(
  cookieValue: string | undefined
): StationAdminSidebarSectionsState {
  return mergeSidebarSections(decodeSidebarSections(cookieValue))
}

export function readStationAdminSidebarSections(): StationAdminSidebarSectionsState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS }
  }

  try {
    const stored = window.localStorage.getItem(STATION_ADMIN_SIDEBAR_SECTIONS_STORAGE_KEY)
    if (stored != null) {
      const parsed = JSON.parse(stored) as Partial<StationAdminSidebarSectionsState>
      const merged = mergeSidebarSections(parsed)
      syncSidebarSectionsCookie(merged)
      return merged
    }
  } catch {
    /* quota / private mode / invalid json */
  }

  const fromCookie = readSidebarSectionsCookie()
  if (fromCookie) {
    try {
      window.localStorage.setItem(
        STATION_ADMIN_SIDEBAR_SECTIONS_STORAGE_KEY,
        JSON.stringify(fromCookie)
      )
    } catch {
      /* quota / private mode */
    }
    return fromCookie
  }

  return { ...DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS }
}

export function writeStationAdminSidebarSections(
  sections: StationAdminSidebarSectionsState
): void {
  if (typeof window === 'undefined') return

  const merged = mergeSidebarSections(sections)
  try {
    window.localStorage.setItem(
      STATION_ADMIN_SIDEBAR_SECTIONS_STORAGE_KEY,
      JSON.stringify(merged)
    )
    syncSidebarSectionsCookie(merged)
    window.dispatchEvent(new Event(STATION_ADMIN_SIDEBAR_SECTIONS_CHANGED_EVENT))
  } catch {
    /* quota / private mode */
  }
}
