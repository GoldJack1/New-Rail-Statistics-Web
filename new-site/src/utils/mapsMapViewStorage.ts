import type { NetworkViewFilter } from '@/constants/stationCollections'
import type L from 'leaflet'
import { isNearEmptyDefaultMapView } from '@/utils/mapsMapEmptyView'

/** Bumped so leave-map pinned restore is authoritative again (v11 was too strict). */
const MAPS_MAP_VIEW_SESSION_KEY = 'railstats:mapsMapView:v12'

export type MapsMapViewSessionState = {
  lat: number
  lng: number
  zoom: number
  /**
   * User pan/zoom or leave-map snapshot. Remount restores these even when the
   * camera only covers part of the network (e.g. return from station details).
   */
  pinned?: boolean
}

export type WriteMapsMapViewOptions = {
  /**
   * Span-aware floor so Supertram cannot persist a UK overview, while
   * GB National Rail / Irish Rail / NI Translink can persist zoom ~5–8.
   */
  minZoom?: number
  /** Mark as user-owned so remount prefers this camera over a fresh fit. */
  pinned?: boolean
}

type MapsMapViewSessionStore = Partial<Record<string, MapsMapViewSessionState>>

let memoryStore: MapsMapViewSessionStore = {}

/** Live map instance — snapshotted when navigating to a station. */
let activeMap: L.Map | null = null
let activeNetworkView: string = 'all'

function isValidView(value: unknown): value is MapsMapViewSessionState {
  if (typeof value !== 'object' || value === null) return false
  const view = value as Partial<MapsMapViewSessionState>
  return (
    typeof view.lat === 'number' &&
    Number.isFinite(view.lat) &&
    typeof view.lng === 'number' &&
    Number.isFinite(view.lng) &&
    typeof view.zoom === 'number' &&
    Number.isFinite(view.zoom) &&
    view.zoom > 0
  )
}

/** UK fallback used when there are no pins — must never be session-persisted. */
function isEmptyDefaultView(view: MapsMapViewSessionState): boolean {
  return isNearEmptyDefaultMapView(view)
}

function isUsableView(
  view: MapsMapViewSessionState,
  options?: WriteMapsMapViewOptions
): boolean {
  if (isEmptyDefaultView(view)) return false
  if (typeof options?.minZoom === 'number' && view.zoom < options.minZoom) return false
  return true
}

function readSessionStore(): MapsMapViewSessionStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(MAPS_MAP_VIEW_SESSION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as MapsMapViewSessionStore
  } catch {
    return {}
  }
}

export function writeMapsMapViewSessionState(
  networkView: NetworkViewFilter | string,
  view: MapsMapViewSessionState,
  options?: WriteMapsMapViewOptions
): void {
  if (!isValidView(view)) return
  if (!isUsableView(view, options)) return

  const pinned = options?.pinned === true || view.pinned === true
  const nextView: MapsMapViewSessionState = {
    lat: view.lat,
    lng: view.lng,
    zoom: view.zoom,
    ...(pinned ? { pinned: true } : {}),
  }
  memoryStore[networkView] = nextView

  if (typeof window === 'undefined') return
  try {
    const store = readSessionStore()
    store[networkView] = nextView
    sessionStorage.setItem(MAPS_MAP_VIEW_SESSION_KEY, JSON.stringify(store))
  } catch {
    /* memory still holds the view */
  }
}

export function readMapsMapViewSessionState(
  networkView: NetworkViewFilter | string
): MapsMapViewSessionState | null {
  const fromMemory = memoryStore[networkView]
  if (isValidView(fromMemory) && !isEmptyDefaultView(fromMemory)) {
    return fromMemory
  }

  const fromSession = readSessionStore()[networkView]
  if (!isValidView(fromSession) || isEmptyDefaultView(fromSession)) {
    return null
  }

  memoryStore[networkView] = fromSession
  return fromSession
}

export function registerActiveStationsMap(map: L.Map, networkView: NetworkViewFilter | string): void {
  activeMap = map
  activeNetworkView = networkView
}

export function unregisterActiveStationsMap(map: L.Map): void {
  if (activeMap === map) {
    activeMap = null
  }
}

export function setActiveStationsMapNetwork(networkView: NetworkViewFilter | string): void {
  activeNetworkView = networkView
}

/**
 * Synchronously persist the live map camera. Call immediately before navigating
 * away from the map (e.g. opening a station) so remount can restore it.
 * Prefer passing `networkView` so the snapshot is keyed correctly even if the
 * active-map pointer is briefly out of sync.
 */
export function snapshotActiveStationsMapView(
  networkView?: NetworkViewFilter | string
): void {
  if (!activeMap) return
  try {
    const size = activeMap.getSize()
    if (size.x <= 0 || size.y <= 0) return
    const center = activeMap.getCenter()
    const view = {
      lat: center.lat,
      lng: center.lng,
      zoom: activeMap.getZoom(),
    }
    // Never pin the empty UK fallback — that is the “Northern England” bug.
    if (isNearEmptyDefaultMapView(view)) return
    const key = networkView ?? activeNetworkView
    if (networkView != null) {
      activeNetworkView = String(networkView)
    }
    writeMapsMapViewSessionState(key, view, { pinned: true })
  } catch {
    /* map mid-teardown */
  }
}

/** Drop a bad saved camera for a network so the next visit fits to stations. */
export function clearMapsMapViewSessionState(networkView: NetworkViewFilter | string): void {
  delete memoryStore[networkView]
  if (typeof window === 'undefined') return
  try {
    const store = readSessionStore()
    delete store[networkView]
    sessionStorage.setItem(MAPS_MAP_VIEW_SESSION_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}
