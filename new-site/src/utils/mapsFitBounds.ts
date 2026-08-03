import L from 'leaflet'
import {
  getMarkerOuterDiameter,
  getSuperTramIconOuterDiameter,
} from './mapMarkerSizing'
import { isValidStationCoordinate } from './stationCoordinates'
import {
  STATIONS_MAP_EMPTY_CENTER,
  STATIONS_MAP_EMPTY_ZOOM,
  isNearEmptyDefaultMapView,
} from './mapsMapEmptyView'

export { STATIONS_MAP_EMPTY_CENTER, STATIONS_MAP_EMPTY_ZOOM, isNearEmptyDefaultMapView } from './mapsMapEmptyView'

type LatLngBoundsLike = {
  getNorth(): number
  getSouth(): number
  getEast(): number
  getWest(): number
}

export type MapFitPadding = {
  top: number
  right: number
  bottom: number
  left: number
}

/** Extra insets for UI that overlays the map canvas (zoom controls, timeline, etc.). */
export type MapFitChromeInsets = {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export type MapPixelSize = {
  x: number
  y: number
}

export type StationsMapFitPaddingOptions = {
  mobile?: boolean
  /** Use SuperTram logo outer size for marker clearance. */
  useSuperTramMarkers?: boolean
  chrome?: MapFitChromeInsets
  /** Live map canvas size — padding and zoom estimates scale to this viewport. */
  mapSize?: MapPixelSize
}

type StationLatLng = {
  latitude: number
  longitude: number
}

/** Cap how far fitBounds can zoom in for tiny clusters; does not force zoom-out. */
export const STATIONS_MAP_FIT_MAX_ZOOM = 14

export const STATIONS_MAP_SINGLE_STATION_ZOOM = 13

/** Default chrome: zoom controls top-left; modest bottom for legend. */
export const STATIONS_MAP_DEFAULT_CHROME: Required<MapFitChromeInsets> = {
  top: 56,
  right: 16,
  bottom: 24,
  left: 56,
}

/** Extra bottom inset when the SuperTram timeline panel is visible (layout/chrome). */
export const STATIONS_MAP_TIMELINE_BOTTOM_CHROME = 12

const MARKER_CLEARANCE_SLACK_PX = 4

/** Reference short-side (px) at which chrome is applied at full strength. */
const CHROME_FULL_VIEWPORT_PX = 480

function spanBasePadding(span: number): number {
  // Large networks need tight edge padding — heavy insets force an extra zoom-out
  // (e.g. GB National Rail showing half of Europe).
  if (span < 0.4) return 32
  if (span < 1) return 36
  if (span < 3) return 40
  if (span < 8) return 20
  return 12
}

/**
 * Minimum zoom that still looks like “this network”, not a UK-wide overview.
 * Compact networks (Supertram) reject zoom &lt; 10; country-scale (GB NR) allow ~4–6.
 * Prefer {@link minUsableZoomForStations} with a map size when available.
 */
export function minUsableZoomForStationSpan(span: number): number {
  if (span < 0.5) return 10
  if (span < 2) return 8
  if (span < 5) return 6
  if (span < 10) return 5
  return 4
}

export function getStationsGeographicSpan(stations: StationLatLng[]): number {
  const bounds = buildStationsLatLngBounds(stations)
  if (!bounds) return 0
  return Math.max(
    Math.abs(bounds.getNorth() - bounds.getSouth()),
    Math.abs(bounds.getEast() - bounds.getWest())
  )
}

/** Keep fitBounds padding inside a fraction of the map so country-scale fits stay stable. */
export function clampFitPaddingToMapSize(
  padding: MapFitPadding,
  mapSize: MapPixelSize,
  maxFraction = 0.35
): MapFitPadding {
  if (mapSize.x <= 0 || mapSize.y <= 0) return padding
  const maxX = Math.max(0, Math.floor(mapSize.x * maxFraction))
  const maxY = Math.max(0, Math.floor(mapSize.y * maxFraction))
  return {
    top: Math.min(padding.top, maxY),
    right: Math.min(padding.right, maxX),
    bottom: Math.min(padding.bottom, maxY),
    left: Math.min(padding.left, maxX),
  }
}

function markerClearancePx(options?: StationsMapFitPaddingOptions): number {
  const mobile = options?.mobile ?? false
  const diameter = options?.useSuperTramMarkers
    ? getSuperTramIconOuterDiameter(false, mobile)
    : getMarkerOuterDiameter(false, mobile)
  return Math.ceil(diameter / 2) + MARKER_CLEARANCE_SLACK_PX
}

function mergeChrome(chrome?: MapFitChromeInsets): Required<MapFitChromeInsets> {
  return {
    top: chrome?.top ?? STATIONS_MAP_DEFAULT_CHROME.top,
    right: chrome?.right ?? STATIONS_MAP_DEFAULT_CHROME.right,
    bottom: chrome?.bottom ?? STATIONS_MAP_DEFAULT_CHROME.bottom,
    left: chrome?.left ?? STATIONS_MAP_DEFAULT_CHROME.left,
  }
}

/** Scale overlay chrome down on short viewports so pins keep usable room. */
function viewportChromeFactor(mapSize?: MapPixelSize): number {
  if (!mapSize || mapSize.x <= 0 || mapSize.y <= 0) return 1
  const shortSide = Math.min(mapSize.x, mapSize.y)
  return Math.min(1, Math.max(0.35, shortSide / CHROME_FULL_VIEWPORT_PX))
}

/**
 * Choose fitBounds padding from pin spread, marker size, overlay chrome, and viewport.
 * When `mapSize` is set, padding is clamped so it cannot consume the canvas.
 */
export function getStationsMapFitPadding(
  bounds: LatLngBoundsLike,
  options?: StationsMapFitPaddingOptions
): MapFitPadding {
  const latSpan = Math.abs(bounds.getNorth() - bounds.getSouth())
  const lngSpan = Math.abs(bounds.getEast() - bounds.getWest())
  const span = Math.max(latSpan, lngSpan)
  const base = spanBasePadding(span)
  const marker = markerClearancePx(options)
  const edge = Math.max(base, marker)
  const chrome = mergeChrome(options?.chrome)

  // Country-scale networks: keep chrome minimal so fitBounds can sit one zoom closer.
  const spanChromeFactor = span >= 8 ? 0.2 : span >= 3 ? 0.4 : span >= 1 ? 0.75 : 1
  const sizeChromeFactor = viewportChromeFactor(options?.mapSize)
  const chromeFactor = spanChromeFactor * sizeChromeFactor

  const padding: MapFitPadding = {
    top: edge + Math.round(chrome.top * chromeFactor),
    right: edge + Math.round(chrome.right * chromeFactor),
    bottom: edge + Math.round(chrome.bottom * chromeFactor),
    left: edge + Math.round(chrome.left * chromeFactor),
  }

  if (options?.mapSize) {
    return clampFitPaddingToMapSize(padding, options.mapSize)
  }
  return padding
}

/** Leaflet PointExpression pairs for fitBounds paddingTopLeft / paddingBottomRight. */
export function fitPaddingToLeafletOptions(padding: MapFitPadding): {
  paddingTopLeft: L.PointExpression
  paddingBottomRight: L.PointExpression
} {
  return {
    paddingTopLeft: [padding.left, padding.top],
    paddingBottomRight: [padding.right, padding.bottom],
  }
}

export function buildStationsLatLngBounds(stations: StationLatLng[]): L.LatLngBounds | null {
  const points: L.LatLngTuple[] = []
  for (const station of stations) {
    if (!isValidStationCoordinate(station.latitude, station.longitude)) continue
    points.push([station.latitude, station.longitude])
  }
  if (points.length === 0) return null
  return L.latLngBounds(points)
}

/**
 * Approximate Leaflet `Map.getBoundsZoom` for a padded viewport (EPSG:3857).
 * Returns an integer zoom that fits `bounds` inside the usable map area.
 */
export function estimateZoomToBounds(
  bounds: LatLngBoundsLike,
  mapSize: MapPixelSize,
  padding: MapFitPadding,
  maxZoom = STATIONS_MAP_FIT_MAX_ZOOM,
  minZoom = 0
): number {
  if (mapSize.x <= 0 || mapSize.y <= 0) return minZoom

  const usableWidth = mapSize.x - padding.left - padding.right
  const usableHeight = mapSize.y - padding.top - padding.bottom
  if (usableWidth <= 0 || usableHeight <= 0) return minZoom

  const refZoom = 0
  const nw = L.CRS.EPSG3857.latLngToPoint(
    L.latLng(bounds.getNorth(), bounds.getWest()),
    refZoom
  )
  const se = L.CRS.EPSG3857.latLngToPoint(
    L.latLng(bounds.getSouth(), bounds.getEast()),
    refZoom
  )
  const boundsWidth = Math.abs(nw.x - se.x)
  const boundsHeight = Math.abs(nw.y - se.y)
  if (boundsWidth < 1e-9 || boundsHeight < 1e-9) return maxZoom

  const scale = Math.min(usableWidth / boundsWidth, usableHeight / boundsHeight)
  if (!(scale > 0) || !Number.isFinite(scale)) return minZoom

  // Same as Leaflet getScaleZoom(scale, 0): zoom = log2(scale)
  const zoom = Math.floor(Math.log(scale) / Math.LN2)
  return Math.min(maxZoom, Math.max(minZoom, zoom))
}

/**
 * Span-aware floor, tightened with a viewport-based fit estimate when map size is known.
 * Small canvases (mobile map + side panel) allow lower zooms for the same network.
 */
export function minUsableZoomForStations(
  stations: StationLatLng[],
  mapSize?: MapPixelSize,
  paddingOptions?: Omit<StationsMapFitPaddingOptions, 'mapSize'>
): number {
  const spanFloor = minUsableZoomForStationSpan(getStationsGeographicSpan(stations))
  if (!mapSize || mapSize.x <= 0 || mapSize.y <= 0) return spanFloor

  const bounds = buildStationsLatLngBounds(stations)
  if (!bounds) return spanFloor

  const padding = getStationsMapFitPadding(bounds, { ...paddingOptions, mapSize })
  const fitZoom = estimateZoomToBounds(bounds, mapSize, padding)
  // Allow a little zoom-out from the ideal fit; never require higher than the span floor
  // when the viewport itself cannot show that zoom without clipping pins.
  return Math.min(spanFloor, Math.max(0, fitZoom - 1))
}

/**
 * Stable signature for “did the pin set meaningfully change?” comparisons.
 * Empty / all-invalid sets share the same signature.
 */
export function getStationsBoundsSignature(stations: StationLatLng[]): string {
  let count = 0
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const station of stations) {
    if (!isValidStationCoordinate(station.latitude, station.longitude)) continue
    count += 1
    minLat = Math.min(minLat, station.latitude)
    maxLat = Math.max(maxLat, station.latitude)
    minLng = Math.min(minLng, station.longitude)
    maxLng = Math.max(maxLng, station.longitude)
  }

  if (count === 0) return '0'

  return `${count}:${minLat.toFixed(5)}:${minLng.toFixed(5)}:${maxLat.toFixed(5)}:${maxLng.toFixed(5)}`
}

export type MapViewCamera = {
  lat: number
  lng: number
  zoom: number
  /** User-owned camera — restore on remount even for partial network views. */
  pinned?: boolean
}

/**
 * Geographic bounds visible inside the map after subtracting pixel padding.
 * Uses EPSG:3857 projection (same as Leaflet's default CRS) without a live map.
 */
export function getPaddedViewBounds(
  camera: MapViewCamera,
  mapSize: MapPixelSize,
  padding: MapFitPadding
): L.LatLngBounds | null {
  if (mapSize.x <= 0 || mapSize.y <= 0) return null
  if (!Number.isFinite(camera.zoom) || camera.zoom <= 0) return null

  const usableWidth = mapSize.x - padding.left - padding.right
  const usableHeight = mapSize.y - padding.top - padding.bottom
  if (usableWidth <= 0 || usableHeight <= 0) return null

  const centerPoint = L.CRS.EPSG3857.latLngToPoint(L.latLng(camera.lat, camera.lng), camera.zoom)
  const nwPoint = L.point(
    centerPoint.x - mapSize.x / 2 + padding.left,
    centerPoint.y - mapSize.y / 2 + padding.top
  )
  const sePoint = L.point(
    centerPoint.x + mapSize.x / 2 - padding.right,
    centerPoint.y + mapSize.y / 2 - padding.bottom
  )

  const nw = L.CRS.EPSG3857.pointToLatLng(nwPoint, camera.zoom)
  const se = L.CRS.EPSG3857.pointToLatLng(sePoint, camera.zoom)
  return L.latLngBounds(nw, se)
}

/**
 * True when the camera shows every pin inside the padded viewport.
 * Empty pin sets are not considered covered (caller should keep auto-fit active).
 */
export function viewCoversStationBounds(
  camera: MapViewCamera,
  mapSize: MapPixelSize,
  stationBounds: LatLngBoundsLike,
  padding: MapFitPadding
): boolean {
  const viewBounds = getPaddedViewBounds(camera, mapSize, padding)
  if (!viewBounds) return false

  const north = stationBounds.getNorth()
  const south = stationBounds.getSouth()
  const east = stationBounds.getEast()
  const west = stationBounds.getWest()

  return (
    viewBounds.contains([north, west]) &&
    viewBounds.contains([north, east]) &&
    viewBounds.contains([south, west]) &&
    viewBounds.contains([south, east])
  )
}

export function viewCoversStations(
  camera: MapViewCamera,
  mapSize: MapPixelSize,
  stations: StationLatLng[],
  paddingOptions?: StationsMapFitPaddingOptions
): boolean {
  const bounds = buildStationsLatLngBounds(stations)
  if (!bounds) return false
  const padding = getStationsMapFitPadding(bounds, { ...paddingOptions, mapSize })
  return viewCoversStationBounds(camera, mapSize, bounds, padding)
}

const ZERO_PADDING: MapFitPadding = { top: 0, right: 0, bottom: 0, left: 0 }

/**
 * True when the saved camera still overlaps the pin set (right region), even if
 * zoomed into a subset. Used for remount restore — full coverage is too strict
 * and would discard intentional user zooms when returning from a station.
 */
export function viewIntersectsStations(
  camera: MapViewCamera,
  mapSize: MapPixelSize,
  stations: StationLatLng[]
): boolean {
  const stationBounds = buildStationsLatLngBounds(stations)
  if (!stationBounds) return false
  const viewBounds = getPaddedViewBounds(camera, mapSize, ZERO_PADDING)
  if (!viewBounds) return false
  return viewBounds.intersects(stationBounds)
}

/**
 * Fraction of the station bounds' geographic footprint visible in the camera
 * (axis-aligned lat/lng approximation).
 */
export function stationBoundsOverlapRatio(
  camera: MapViewCamera,
  mapSize: MapPixelSize,
  stations: StationLatLng[]
): number {
  const stationBounds = buildStationsLatLngBounds(stations)
  if (!stationBounds) return 0
  const viewBounds = getPaddedViewBounds(camera, mapSize, ZERO_PADDING)
  if (!viewBounds) return 0

  const north = Math.min(viewBounds.getNorth(), stationBounds.getNorth())
  const south = Math.max(viewBounds.getSouth(), stationBounds.getSouth())
  const east = Math.min(viewBounds.getEast(), stationBounds.getEast())
  const west = Math.max(viewBounds.getWest(), stationBounds.getWest())
  if (north <= south || east <= west) return 0

  const stationLat = Math.abs(stationBounds.getNorth() - stationBounds.getSouth())
  const stationLng = Math.abs(stationBounds.getEast() - stationBounds.getWest())
  const stationArea = stationLat * stationLng
  if (stationArea < 1e-12) return 1

  return ((north - south) * (east - west)) / stationArea
}

/** Overlap at or above this keeps a saved overview (network mostly on screen). */
const RESTORE_NETWORK_OVERLAP_MIN = 0.85

/** Zoom levels past the ideal fit that count as an intentional close-up. */
const RESTORE_CLOSEUP_ZOOM_SLACK = 4

/** Close-ups must cover only a small fraction of the national footprint. */
const RESTORE_CLOSEUP_OVERLAP_MAX = 0.25

/**
 * Whether to restore a saved camera instead of fitting all pins.
 *
 * - **Pinned** (user pan/zoom or leave-map snapshot): always restore except the
 *   empty UK fallback. This is what keeps the camera when returning from station details.
 * - **Unpinned** (auto-fit persist): keep heuristics that reject mid-zoom partial
 *   “Northern England” overviews for national networks.
 */
export function shouldRestoreSavedMapView(
  saved: MapViewCamera,
  mapSize: MapPixelSize,
  stations: StationLatLng[],
  paddingOptions?: StationsMapFitPaddingOptions
): boolean {
  if (!Number.isFinite(saved.lat) || !Number.isFinite(saved.lng)) return false
  if (!Number.isFinite(saved.zoom) || saved.zoom <= 0) return false
  if (isNearEmptyDefaultMapView(saved)) return false

  // Exact leave-map / user camera — restore even before pins load or map size is known.
  if (saved.pinned) return true

  if (mapSize.x <= 0 || mapSize.y <= 0) return false
  if (stations.length === 0) return false
  if (!viewIntersectsStations(saved, mapSize, stations)) return false

  const optionsWithSize: StationsMapFitPaddingOptions = { ...paddingOptions, mapSize }
  if (saved.zoom < minUsableZoomForStations(stations, mapSize, paddingOptions)) return false

  if (viewCoversStations(saved, mapSize, stations, optionsWithSize)) return true

  const overlap = stationBoundsOverlapRatio(saved, mapSize, stations)
  if (overlap >= RESTORE_NETWORK_OVERLAP_MIN) return true

  const bounds = buildStationsLatLngBounds(stations)
  if (!bounds) return false
  const padding = getStationsMapFitPadding(bounds, optionsWithSize)
  const fitZoom = estimateZoomToBounds(bounds, mapSize, padding)

  // Intentional close-up: clearly zoomed past the network fit AND only showing a
  // small slice of the network (e.g. London after opening a station).
  return (
    saved.zoom >= fitZoom + RESTORE_CLOSEUP_ZOOM_SLACK &&
    overlap <= RESTORE_CLOSEUP_OVERLAP_MAX
  )
}

export type StationsFitPlan =
  | { kind: 'empty'; persistable: false }
  | { kind: 'single'; persistable: true; lat: number; lng: number; zoom: number }
  | {
      kind: 'bounds'
      persistable: true
      bounds: L.LatLngBounds
      padding: MapFitPadding
      maxZoom: number
      /** Viewport-aware zoom estimate (informational / tests). */
      estimatedZoom: number
    }

/** Pure plan for framing stations — empty results must not be persisted. */
export function planStationsMapFit(
  stations: StationLatLng[],
  options?: StationsMapFitPaddingOptions
): StationsFitPlan {
  const valid = stations.filter((station) =>
    isValidStationCoordinate(station.latitude, station.longitude)
  )

  if (valid.length === 0) {
    return { kind: 'empty', persistable: false }
  }

  if (valid.length === 1) {
    return {
      kind: 'single',
      persistable: true,
      lat: valid[0].latitude,
      lng: valid[0].longitude,
      zoom: STATIONS_MAP_SINGLE_STATION_ZOOM,
    }
  }

  const bounds = L.latLngBounds(
    valid.map((station) => [station.latitude, station.longitude] as L.LatLngTuple)
  )
  const padding = getStationsMapFitPadding(bounds, options)
  const mapSize = options?.mapSize
  const estimatedZoom =
    mapSize && mapSize.x > 0 && mapSize.y > 0
      ? estimateZoomToBounds(bounds, mapSize, padding)
      : STATIONS_MAP_FIT_MAX_ZOOM

  return {
    kind: 'bounds',
    persistable: true,
    bounds,
    padding,
    maxZoom: STATIONS_MAP_FIT_MAX_ZOOM,
    estimatedZoom,
  }
}
