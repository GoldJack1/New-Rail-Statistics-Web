import {
  DEFAULT_NETWORK_COLLECTION_ID,
  DEFAULT_NETWORK_VIEW,
  STATION_COLLECTION_STORAGE_KEY,
  STATION_NETWORK_STORAGE_KEY,
  STATION_NETWORK_VIEW_COOKIE,
  STATION_NETWORK_VIEW_STORAGE_KEY,
  deriveCollectionId,
  isNetworkCollection,
  isNetworkViewFilter,
  type NetworkCollectionId,
  type NetworkViewFilter,
  type StationCollectionId,
} from '@/constants/stationCollections'

function syncDerivedCollectionStorage(): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  try {
    const collectionId = deriveCollectionId(getStationNetworkView(), getStationNetworkId())
    window.localStorage.setItem(STATION_COLLECTION_STORAGE_KEY, collectionId)
  } catch {
    // Ignore unavailable browser storage.
  }
}

function readLegacyCollectionStorage(): StationCollectionId | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(STATION_COLLECTION_STORAGE_KEY)
    if (stored != null && isNetworkCollection(stored)) return stored
    if (stored === 'stations2603') return 'stations_gbnr'
  } catch {
    // Ignore unavailable browser storage.
  }
  return null
}

export function getStationNetworkId(): NetworkCollectionId {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return DEFAULT_NETWORK_COLLECTION_ID
  }
  try {
    const stored = window.localStorage.getItem(STATION_NETWORK_STORAGE_KEY)
    if (stored != null && isNetworkCollection(stored)) return stored
    const legacy = readLegacyCollectionStorage()
    if (legacy && isNetworkCollection(legacy)) return legacy
  } catch {
    // Ignore unavailable browser storage.
  }
  return DEFAULT_NETWORK_COLLECTION_ID
}

export function setStationNetworkId(id: NetworkCollectionId): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  try {
    window.localStorage.setItem(STATION_NETWORK_STORAGE_KEY, id)
    syncDerivedCollectionStorage()
  } catch {
    // Ignore unavailable browser storage.
  }
}

function syncNetworkViewCookie(view: NetworkViewFilter): void {
  if (typeof document === 'undefined') return
  document.cookie = `${STATION_NETWORK_VIEW_COOKIE}=${view}; path=/; max-age=31536000; SameSite=Lax`
}

export function getStationNetworkView(): NetworkViewFilter {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return DEFAULT_NETWORK_VIEW
  }
  try {
    const stored = window.localStorage.getItem(STATION_NETWORK_VIEW_STORAGE_KEY)
    if (stored != null && isNetworkViewFilter(stored)) {
      syncNetworkViewCookie(stored)
      return stored
    }
  } catch {
    // Ignore unavailable browser storage.
  }
  return DEFAULT_NETWORK_VIEW
}

export function setStationNetworkView(view: NetworkViewFilter): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  try {
    window.localStorage.setItem(STATION_NETWORK_VIEW_STORAGE_KEY, view)
    if (view !== 'all') window.localStorage.setItem(STATION_NETWORK_STORAGE_KEY, view)
    syncNetworkViewCookie(view)
    syncDerivedCollectionStorage()
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function getStationCollectionName(): StationCollectionId {
  return deriveCollectionId(getStationNetworkView(), getStationNetworkId())
}

export function setStationCollectionName(id: StationCollectionId): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  try {
    window.localStorage.setItem(STATION_COLLECTION_STORAGE_KEY, id)
    if (isNetworkCollection(id)) window.localStorage.setItem(STATION_NETWORK_STORAGE_KEY, id)
  } catch {
    // Ignore unavailable browser storage.
  }
}
