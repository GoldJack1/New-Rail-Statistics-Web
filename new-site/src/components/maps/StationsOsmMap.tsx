'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  NETWORK_COLLECTION_IDS,
  NETWORK_LABELS,
  isNetworkCollection,
  type NetworkCollectionId,
  type NetworkViewFilter,
} from '../../constants/stationCollections'
import {
  NETWORK_MAP_COLORS,
  NETWORK_MAP_FALLBACK_COLOR,
  PENDING_NEW_STATION_MAP_COLOR,
} from '../../constants/stationNetworkMapColors'
import { useTheme, readThemeFromDocument } from '../../hooks/useTheme'
import { getStationNetworkCollectionId, getStationMapKey } from '../../utils/stationAreaSlug'
import { isValidStationCoordinate } from '../../utils/stationCoordinates'
import {
  createSuperTramMapDivIcon,
  isSuperTramMapStop,
} from '../../utils/superTramMapMarker'
import { getMarkerHitRadius, getMarkerVisualRadius, MARKER_STROKE } from '../../utils/mapMarkerSizing'
import { addThemeTileLayersToMap, swapThemeTileLayers, type MapTileLayerRefs } from '../../utils/mapTileLayers'
import {
  isStationVisibleAtTimelineCutoff,
  type SuperTramTimelineCutoff,
} from '../../utils/superTramTimeline'
import { LIGHTRAIL_COLLECTION_ID } from '../../utils/lightRailStationFields'
import {
  getMapViewportMarkerLimit,
  getStationsForViewportMarkers,
  shouldCullStationsMapMarkers,
} from '../../utils/mapsViewportMarkers'
import {
  readMapsMapViewSessionState,
  writeMapsMapViewSessionState,
  registerActiveStationsMap,
  unregisterActiveStationsMap,
  setActiveStationsMapNetwork,
  snapshotActiveStationsMapView,
  clearMapsMapViewSessionState,
} from '../../utils/mapsMapViewStorage'
import {
  STATIONS_MAP_DEFAULT_CHROME,
  STATIONS_MAP_EMPTY_CENTER,
  STATIONS_MAP_EMPTY_ZOOM,
  isNearEmptyDefaultMapView,
  fitPaddingToLeafletOptions,
  minUsableZoomForStations,
  planStationsMapFit,
  shouldRestoreSavedMapView,
  type MapPixelSize,
  type StationsMapFitPaddingOptions,
} from '../../utils/mapsFitBounds'
import type { Station } from '../../types'
import {
  MapAddStationContextMenu,
  type MapAddStationContextMenuState,
} from './MapAddStationContextMenu'
import { MapZoomControls } from './MapZoomControls'
import './StationsOsmMap.css'
import './leafletDarkTiles.css'

const MOBILE_MAP_MEDIA = '(max-width: 639px)'
const VIEWPORT_MOVEEND_DEBOUNCE_MS = 150
const PROGRAMMATIC_MOVE_MS = 300
const SCROLL_ZOOM_HINT_MS = 2200

/** Keeps the selected-station overlay inside the visible map stage while the page scrolls (desktop). */
function MapSelectedCardDock({
  stageRef,
  children,
}: {
  stageRef: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const dockRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const dock = dockRef.current
    const stage = stageRef.current
    if (!dock || !stage) return

    const mobileMq = window.matchMedia(MOBILE_MAP_MEDIA)

    const clearInlinePosition = () => {
      dock.style.visibility = ''
      dock.style.pointerEvents = ''
      dock.style.bottom = ''
      dock.style.left = ''
      dock.style.right = ''
      dock.style.transform = ''
      dock.style.maxHeight = ''
    }

    const readSpacingPx = (varName: string, fallback: number) => {
      const probe = document.createElement('div')
      probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:var(${varName});`
      document.body.appendChild(probe)
      const px = probe.getBoundingClientRect().height
      probe.remove()
      return px > 0 ? px : fallback
    }

    let spacingMd = readSpacingPx('--space-md', 12)
    let rafId = 0
    let removeDesktopListeners: (() => void) | null = null

    const updateDesktop = () => {
      const rect = stage.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const spacing = spacingMd

      const visibleTop = Math.max(rect.top, 0)
      const visibleBottom = Math.min(rect.bottom, viewportHeight)
      const visibleLeft = Math.max(rect.left, 0)
      const visibleRight = Math.min(rect.right, viewportWidth)
      const visibleHeight = visibleBottom - visibleTop
      const visibleWidth = visibleRight - visibleLeft

      if (visibleHeight < 48 || visibleWidth < 48) {
        dock.style.visibility = 'hidden'
        dock.style.pointerEvents = 'none'
        return
      }

      dock.style.visibility = 'visible'
      dock.style.pointerEvents = 'auto'
      dock.style.bottom = `${Math.max(0, viewportHeight - visibleBottom) + spacing}px`
      dock.style.maxHeight = ''
      dock.style.left = 'auto'
      dock.style.right = `${Math.max(0, viewportWidth - visibleRight) + spacing}px`
      dock.style.transform = 'none'
    }

    const scheduleDesktopUpdate = () => {
      if (rafId !== 0) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        updateDesktop()
      })
    }

    const bindDesktop = () => {
      clearInlinePosition()
      const onResize = () => {
        spacingMd = readSpacingPx('--space-md', 12)
        scheduleDesktopUpdate()
      }

      updateDesktop()
      window.addEventListener('scroll', scheduleDesktopUpdate, { capture: true, passive: true })
      window.addEventListener('resize', onResize)
      const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleDesktopUpdate) : null
      observer?.observe(stage)

      removeDesktopListeners = () => {
        if (rafId !== 0) {
          window.cancelAnimationFrame(rafId)
          rafId = 0
        }
        window.removeEventListener('scroll', scheduleDesktopUpdate, true)
        window.removeEventListener('resize', onResize)
        observer?.disconnect()
      }
    }

    const unbindDesktop = () => {
      removeDesktopListeners?.()
      removeDesktopListeners = null
      clearInlinePosition()
    }

    const syncMode = () => {
      unbindDesktop()
      // Phone: CSS pins the card in the stage — no scroll tracking.
      if (!mobileMq.matches) bindDesktop()
    }

    syncMode()
    mobileMq.addEventListener('change', syncMode)

    return () => {
      mobileMq.removeEventListener('change', syncMode)
      unbindDesktop()
    }
  }, [stageRef, children])

  return (
    <div ref={dockRef} className="stations-map-selected-dock">
      {children}
    </div>
  )
}

function getMapFitPaddingOptions(
  networkView: NetworkViewFilter,
  mobile: boolean,
  mapSize?: MapPixelSize
): StationsMapFitPaddingOptions {
  return {
    mobile,
    useSuperTramMarkers: networkView === LIGHTRAIL_COLLECTION_ID,
    mapSize,
    chrome: { ...STATIONS_MAP_DEFAULT_CHROME },
  }
}

type StationMarkerPair =
  | {
      kind: 'circle'
      hit: L.CircleMarker
      visual: L.CircleMarker
    }
  | {
      kind: 'supertram-logo'
      hit: L.Marker
      visual: L.Marker
    }

function isMobileMapViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MAP_MEDIA).matches
}

function getMarkerRadii(isSelected: boolean, mobile: boolean) {
  return {
    visual: getMarkerVisualRadius(isSelected, mobile),
    hit: getMarkerHitRadius(isSelected, mobile),
  }
}

interface StationsOsmMapProps {
  stations: Station[]
  /** Published Firestore stations only — used for map bounds (excludes pending new). */
  publishedStations: Station[]
  pendingNewStationKeys?: ReadonlySet<string>
  networkView: NetworkViewFilter
  selectedStationId: string | null
  onStationSelect: (station: Station) => void
  onStationClear: () => void
  allowAddStation?: boolean
  addStationMode?: boolean
  onAddStationAtLocation?: (latitude: number, longitude: number) => void
  onAddStationModeChange?: (enabled: boolean) => void
  /** SuperTram opening timeline — null disables timeline filtering (visibility only). */
  timelineCutoff?: SuperTramTimelineCutoff | null
  timelineShowUndatedAtMax?: boolean
  liteMode?: boolean
  /**
   * Increment when the user changes network tabs to fit the map to that network.
   * Remounts (e.g. back from a station) should keep the previous value.
   */
  fitNonce?: number
  /**
   * False while the current network’s station set is still loading.
   * Parent should pass empty station lists until ready so pins appear together.
   */
  dataReady?: boolean
  /** Overlay content positioned over the map stage (not the attribution bar). */
  children?: ReactNode
}

function getStationLegendCollectionId(
  station: Station,
  networkView: NetworkViewFilter
): NetworkCollectionId | null {
  const collectionId =
    station.sourceCollectionId && isNetworkCollection(station.sourceCollectionId)
      ? station.sourceCollectionId
      : getStationNetworkCollectionId(station, networkView !== 'all' ? networkView : undefined)

  return collectionId && isNetworkCollection(collectionId) ? collectionId : null
}

function getStationMarkerColor(
  station: Station,
  networkView: NetworkViewFilter,
  pendingNewStationKeys: ReadonlySet<string>
): string {
  if (pendingNewStationKeys.has(getStationMapKey(station))) {
    return PENDING_NEW_STATION_MAP_COLOR
  }

  const collectionId = getStationLegendCollectionId(station, networkView)
  if (collectionId) {
    return NETWORK_MAP_COLORS[collectionId]
  }
  return NETWORK_MAP_FALLBACK_COLOR
}

function setMarkerTimelineVisibility(marker: StationMarkerPair, visible: boolean): void {
  const opacity = visible ? 1 : 0

  if (marker.kind === 'supertram-logo') {
    const iconMarker = marker.visual as L.Marker
    iconMarker.setOpacity(opacity)
    const element = iconMarker.getElement()
    if (element) {
      element.style.pointerEvents = visible ? 'auto' : 'none'
    }
    return
  }

  marker.hit.setStyle({
    fillOpacity: visible ? 0.001 : 0,
    interactive: visible,
  })

  const circleMarker = marker.visual as L.CircleMarker
  circleMarker.setStyle({
    fillOpacity: visible ? 0.95 : 0,
    opacity,
  })
}

function applyMarkerStyle(
  marker: StationMarkerPair,
  station: Station,
  networkView: NetworkViewFilter,
  pendingNewStationKeys: ReadonlySet<string>,
  isSelected: boolean,
  mobile: boolean
): void {
  const { visual, hit } = getMarkerRadii(isSelected, mobile)
  const isPendingNew = pendingNewStationKeys.has(getStationMapKey(station))

  if (marker.kind === 'supertram-logo') {
    const iconMarker = marker.visual as L.Marker
    iconMarker.setIcon(createSuperTramMapDivIcon(isSelected, mobile, isPendingNew))
    iconMarker.setZIndexOffset(isSelected ? 1000 : 0)
    return
  }

  marker.hit.setStyle({
    radius: hit,
    fillOpacity: 0.001,
    stroke: false,
    weight: 0,
  })

  const circleMarker = marker.visual as L.CircleMarker
  circleMarker.setStyle({
    radius: visual,
    fillColor: getStationMarkerColor(station, networkView, pendingNewStationKeys),
    color: isSelected ? MARKER_STROKE.color.selected : MARKER_STROKE.color.normal,
    weight: isSelected ? MARKER_STROKE.weight.selected : MARKER_STROKE.weight.normal,
    fillOpacity: 0.95,
  })
}

export function StationsOsmMap({
  stations,
  publishedStations,
  pendingNewStationKeys = new Set<string>(),
  networkView,
  selectedStationId,
  onStationSelect,
  onStationClear,
  allowAddStation = false,
  addStationMode = false,
  onAddStationAtLocation,
  onAddStationModeChange,
  timelineCutoff = null,
  timelineShowUndatedAtMax = true,
  liteMode = false,
  fitNonce = 0,
  dataReady = true,
  children,
}: StationsOsmMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapStageRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const tileLayersRef = useRef<MapTileLayerRefs | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const markersByIdRef = useRef<Map<string, StationMarkerPair>>(new Map())
  const onStationSelectRef = useRef(onStationSelect)
  const onStationClearRef = useRef(onStationClear)
  const allowAddStationRef = useRef(allowAddStation)
  const addStationModeRef = useRef(addStationMode)
  const onAddStationAtLocationRef = useRef(onAddStationAtLocation)
  const onAddStationModeChangeRef = useRef(onAddStationModeChange)
  const networkViewRef = useRef(networkView)
  const mobileMarkersRef = useRef(isMobileMapViewport())
  const publishedStationsRef = useRef(publishedStations)
  const [addStationMenu, setAddStationMenu] = useState<MapAddStationContextMenuState | null>(null)
  const [mobileMarkers, setMobileMarkers] = useState(isMobileMapViewport)
  const [visibleLegendNetworks, setVisibleLegendNetworks] = useState<NetworkCollectionId[]>([])
  const [viewportBounds, setViewportBounds] = useState<L.LatLngBounds | null>(null)
  /** Plain wheel zooms only after the map is clicked/dragged (Google Maps–style). */
  const wheelZoomArmedRef = useRef(false)
  const [wheelZoomArmed, setWheelZoomArmed] = useState(false)
  const [showScrollZoomHint, setShowScrollZoomHint] = useState(false)
  const scrollZoomHintTimerRef = useRef<number | null>(null)
  const showUnarmedScrollHintRef = useRef<() => void>(() => {})
  const viewportMoveEndTimerRef = useRef<number | null>(null)
  const previousFitNonceRef = useRef(fitNonce)
  const programmaticMoveRef = useRef(false)
  const programmaticClearTimerRef = useRef<number | null>(null)
  /** True after user pan/zoom or a successful saved-camera restore. */
  const userCameraRef = useRef(false)
  /** Camera apply succeeded for the current dataReady + fitNonce generation. */
  const didFitForReadyRef = useRef(false)
  const dataReadyRef = useRef(dataReady)
  const stationsByKeyRef = useRef<Map<string, Station>>(new Map())
  const { theme } = useTheme()
  const themeKey = theme === 'dark' ? 'dark' : 'light'

  onStationSelectRef.current = onStationSelect
  onStationClearRef.current = onStationClear
  allowAddStationRef.current = allowAddStation
  addStationModeRef.current = addStationMode
  onAddStationAtLocationRef.current = onAddStationAtLocation
  onAddStationModeChangeRef.current = onAddStationModeChange
  networkViewRef.current = networkView
  mobileMarkersRef.current = mobileMarkers
  publishedStationsRef.current = publishedStations
  dataReadyRef.current = dataReady

  useEffect(() => {
    setActiveStationsMapNetwork(networkView)
  }, [networkView])

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MAP_MEDIA)
    const onChange = () => setMobileMarkers(mediaQuery.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  const mapStations = useMemo(
    () =>
      stations.filter((station) => {
        if (!isValidStationCoordinate(station.latitude, station.longitude)) return false
        if (networkView === 'all') return true
        return station.sourceCollectionId === networkView
      }),
    [stations, networkView]
  )

  const cullViewport = shouldCullStationsMapMarkers(mapStations.length, networkView, liteMode)

  const markerStations = useMemo(() => {
    if (!cullViewport) return mapStations
    // Wait for the first bounds sample so All / GB NR don't mount every pin once.
    if (!viewportBounds) return []
    return getStationsForViewportMarkers(mapStations, viewportBounds, {
      selectedStationId,
      maxMarkers: getMapViewportMarkerLimit(liteMode),
    })
  }, [cullViewport, liteMode, mapStations, viewportBounds, selectedStationId])

  stationsByKeyRef.current = new Map(
    mapStations.map((station) => [getStationMapKey(station), station])
  )

  const hasVisiblePendingNew = useMemo(
    () => mapStations.some((station) => pendingNewStationKeys.has(getStationMapKey(station))),
    [mapStations, pendingNewStationKeys]
  )

  const updateVisibleLegendNetworks = useCallback(
    (map: L.Map) => {
      if (networkView !== 'all') {
        setVisibleLegendNetworks([])
        return
      }

      const bounds = map.getBounds()
      const visible = new Set<NetworkCollectionId>()

      for (const station of mapStations) {
        if (!bounds.contains([station.latitude, station.longitude])) continue
        const collectionId = getStationLegendCollectionId(station, networkView)
        if (collectionId) visible.add(collectionId)
      }

      setVisibleLegendNetworks(NETWORK_COLLECTION_IDS.filter((id) => visible.has(id)))
    },
    [mapStations, networkView]
  )

  const withProgrammaticMove = useCallback((fn: () => void) => {
    programmaticMoveRef.current = true
    if (programmaticClearTimerRef.current !== null) {
      window.clearTimeout(programmaticClearTimerRef.current)
    }
    try {
      fn()
    } finally {
      programmaticClearTimerRef.current = window.setTimeout(() => {
        programmaticClearTimerRef.current = null
        programmaticMoveRef.current = false
      }, PROGRAMMATIC_MOVE_MS)
    }
  }, [])

  const setWheelZoomArmedState = useCallback((armed: boolean) => {
    wheelZoomArmedRef.current = armed
    setWheelZoomArmed(armed)
    const map = mapRef.current
    if (map) {
      if (armed) map.scrollWheelZoom.enable()
      else map.scrollWheelZoom.disable()
    }
    if (armed) {
      setShowScrollZoomHint(false)
      if (scrollZoomHintTimerRef.current !== null) {
        window.clearTimeout(scrollZoomHintTimerRef.current)
        scrollZoomHintTimerRef.current = null
      }
    }
  }, [])

  showUnarmedScrollHintRef.current = () => {
    if (wheelZoomArmedRef.current) return
    setShowScrollZoomHint(true)
    if (scrollZoomHintTimerRef.current !== null) {
      window.clearTimeout(scrollZoomHintTimerRef.current)
    }
    scrollZoomHintTimerRef.current = window.setTimeout(() => {
      scrollZoomHintTimerRef.current = null
      setShowScrollZoomHint(false)
    }, SCROLL_ZOOM_HINT_MS)
  }

  const persistCurrentMapView = useCallback(
    (map: L.Map, nextNetworkView: NetworkViewFilter, options?: { pinned?: boolean }) => {
      const size = map.getSize()
      if (size.x <= 0 || size.y <= 0) return
      const center = map.getCenter()
      const mapSize: MapPixelSize = { x: size.x, y: size.y }
      const paddingOptions = getMapFitPaddingOptions(
        networkViewRef.current,
        mobileMarkersRef.current,
        mapSize
      )
      writeMapsMapViewSessionState(
        nextNetworkView,
        {
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom(),
        },
        {
          minZoom: minUsableZoomForStations(publishedStationsRef.current, mapSize, paddingOptions),
          pinned: options?.pinned,
        }
      )
    },
    []
  )

  const fitMapToStations = useCallback((map: L.Map, nextStations: Station[]): boolean => {
    const size = map.getSize()
    const mapSize: MapPixelSize | undefined =
      size.x > 0 && size.y > 0 ? { x: size.x, y: size.y } : undefined
    const plan = planStationsMapFit(
      nextStations,
      getMapFitPaddingOptions(networkViewRef.current, mobileMarkersRef.current, mapSize)
    )

    if (plan.kind === 'empty') {
      map.setView(STATIONS_MAP_EMPTY_CENTER, STATIONS_MAP_EMPTY_ZOOM, { animate: false })
      return false
    }

    if (plan.kind === 'single') {
      map.setView([plan.lat, plan.lng], plan.zoom, { animate: false })
      return true
    }

    map.fitBounds(plan.bounds, {
      ...fitPaddingToLeafletOptions(plan.padding),
      maxZoom: plan.maxZoom,
      animate: false,
    })
    return true
  }, [])

  /**
   * Restore pinned session camera or fit pins once the canvas has a real size.
   * Returns false when size is 0 so callers can retry (do not consume the one-shot).
   */
  const tryApplyMapCamera = useCallback((): boolean => {
    const map = mapRef.current
    if (!map) return false

    let size = map.getSize()
    if (size.x <= 0 || size.y <= 0) {
      withProgrammaticMove(() => {
        map.invalidateSize({ pan: false })
      })
      size = map.getSize()
      if (size.x <= 0 || size.y <= 0) return false
    }

    const mapSize: MapPixelSize = { x: size.x, y: size.y }
    const paddingOptions = getMapFitPaddingOptions(
      networkViewRef.current,
      mobileMarkersRef.current,
      mapSize
    )
    const saved = readMapsMapViewSessionState(networkViewRef.current)
    const stations = publishedStationsRef.current

    if (
      saved &&
      shouldRestoreSavedMapView(saved, mapSize, stations, paddingOptions)
    ) {
      // Always re-assert center/zoom once size is known (deep zooms can be lost on
      // the size-0 mount setView). Skip only when already exact after a prior apply.
      const center = map.getCenter()
      const zoomMatches = Math.abs(map.getZoom() - saved.zoom) < 0.05
      const centerMatches =
        Math.abs(center.lat - saved.lat) < 1e-6 && Math.abs(center.lng - saved.lng) < 1e-6
      if (!didFitForReadyRef.current || !zoomMatches || !centerMatches) {
        withProgrammaticMove(() => {
          map.setView([saved.lat, saved.lng], saved.zoom, { animate: false })
        })
      }
      userCameraRef.current = true
      didFitForReadyRef.current = true
      return true
    }

    if (didFitForReadyRef.current) return true

    // Pinned leave-map camera exists but wasn't applied (should be rare). Wait —
    // do not auto-fit and overwrite it with a national Northern England overview.
    // Near-empty “pinned” cameras are invalid and must fall through to fit.
    if (saved?.pinned && !isNearEmptyDefaultMapView(saved)) return false

    // Wait for pins before auto-fitting.
    if (!dataReadyRef.current || stations.length === 0) return false

    // Ignore spurious “user camera” from invalidateSize while still on the empty default.
    const center = map.getCenter()
    const onEmptyDefault = isNearEmptyDefaultMapView({
      lat: center.lat,
      lng: center.lng,
      zoom: map.getZoom(),
    })
    if (userCameraRef.current && !onEmptyDefault) {
      didFitForReadyRef.current = true
      return true
    }
    if (onEmptyDefault) {
      userCameraRef.current = false
    }

    withProgrammaticMove(() => {
      const persistable = fitMapToStations(map, stations)
      // Only persist auto-fits — never replace a leave-map pinned snapshot.
      if (persistable && !readMapsMapViewSessionState(networkViewRef.current)?.pinned) {
        persistCurrentMapView(map, networkViewRef.current)
      }
    })
    didFitForReadyRef.current = true
    return true
  }, [withProgrammaticMove, fitMapToStations, persistCurrentMapView])

  const tryApplyMapCameraRef = useRef(tryApplyMapCamera)
  tryApplyMapCameraRef.current = tryApplyMapCamera

  const removeMarkerPair = useCallback((layerGroup: L.LayerGroup, marker: StationMarkerPair) => {
    layerGroup.removeLayer(marker.hit)
    if (marker.kind === 'circle' && marker.visual !== marker.hit) {
      layerGroup.removeLayer(marker.visual)
    }
  }, [])

  const createStationMarker = useCallback(
    (station: Station, layerGroup: L.LayerGroup, isSelected: boolean): StationMarkerPair => {
      const key = getStationMapKey(station)
      const { hit, visual } = getMarkerRadii(isSelected, mobileMarkers)
      const latLng: L.LatLngTuple = [station.latitude, station.longitude]
      const isPendingNew = pendingNewStationKeys.has(key)
      const useSuperTramLogo = isSuperTramMapStop(station, networkView)

      const selectStation = (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event)
        const current = stationsByKeyRef.current.get(key)
        if (current) onStationSelectRef.current(current)
      }

      if (useSuperTramLogo) {
        const logoMarker = L.marker(latLng, {
          icon: createSuperTramMapDivIcon(isSelected, mobileMarkers, isPendingNew),
          interactive: true,
          keyboard: false,
        })
        logoMarker.on('click', selectStation)
        if (isSelected) logoMarker.setZIndexOffset(1000)
        layerGroup.addLayer(logoMarker)
        return {
          hit: logoMarker,
          visual: logoMarker,
          kind: 'supertram-logo',
        }
      }

      const hitMarker = L.circleMarker(latLng, {
        radius: hit,
        fillColor: '#000000',
        fillOpacity: 0.001,
        stroke: false,
        weight: 0,
        className: 'stations-osm-map__hit-target',
      })

      const visualMarker = L.circleMarker(latLng, {
        radius: visual,
        fillColor: getStationMarkerColor(station, networkView, pendingNewStationKeys),
        color: isSelected ? MARKER_STROKE.color.selected : MARKER_STROKE.color.normal,
        weight: isSelected ? MARKER_STROKE.weight.selected : MARKER_STROKE.weight.normal,
        fillOpacity: 0.95,
        interactive: false,
        className: 'stations-osm-map__visual-target',
      })

      hitMarker.on('click', selectStation)
      layerGroup.addLayer(hitMarker)
      layerGroup.addLayer(visualMarker)
      return {
        hit: hitMarker,
        visual: visualMarker,
        kind: 'circle',
      }
    },
    [mobileMarkers, networkView, pendingNewStationKeys]
  )

  const syncMarkers = useCallback(
    (map: L.Map) => {
      let layerGroup = markersLayerRef.current
      if (!layerGroup) {
        layerGroup = L.layerGroup().addTo(map)
        markersLayerRef.current = layerGroup
      }

      const nextKeys = new Set(markerStations.map((station) => getStationMapKey(station)))

      markersByIdRef.current.forEach((marker, key) => {
        if (nextKeys.has(key)) return
        removeMarkerPair(layerGroup!, marker)
        markersByIdRef.current.delete(key)
      })

      if (markerStations.length === 0) return

      markerStations.forEach((station) => {
        const key = getStationMapKey(station)
        const existing = markersByIdRef.current.get(key)
        const useSuperTramLogo = isSuperTramMapStop(station, networkView)
        const desiredKind = useSuperTramLogo ? 'supertram-logo' : 'circle'
        const isSelected = key === selectedStationId

        if (existing && existing.kind === desiredKind) {
          const current = existing.visual.getLatLng()
          if (
            Math.abs(current.lat - station.latitude) > 1e-9 ||
            Math.abs(current.lng - station.longitude) > 1e-9
          ) {
            const latLng: L.LatLngTuple = [station.latitude, station.longitude]
            existing.visual.setLatLng(latLng)
            if (existing.kind === 'circle' && existing.hit !== existing.visual) {
              existing.hit.setLatLng(latLng)
            }
          }
          return
        }

        if (existing) {
          removeMarkerPair(layerGroup!, existing)
          markersByIdRef.current.delete(key)
        }

        markersByIdRef.current.set(key, createStationMarker(station, layerGroup!, isSelected))
      })
    },
    [markerStations, networkView, selectedStationId, createStationMarker, removeMarkerPair]
  )

  // Mount map once — restore saved camera if possible; otherwise wait for dataReady fit.
  useEffect(() => {
    if (!mapContainerRef.current) return

    const initialNetwork = networkViewRef.current
    const savedOnMount = readMapsMapViewSessionState(initialNetwork)
    const restoreOnMount =
      savedOnMount != null &&
      shouldRestoreSavedMapView(
        savedOnMount,
        { x: 1, y: 1 },
        [],
        getMapFitPaddingOptions(initialNetwork, mobileMarkersRef.current)
      )

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      // Plain wheel scrolls the page until the map is armed (click/drag). Ctrl/Cmd+wheel
      // and trackpad pinch (usually reported as ctrl+wheel) always zoom via onWheel.
      scrollWheelZoom: false,
      preferCanvas: true,
      maxZoom: 19,
      minZoom: 3,
    }).setView(
      restoreOnMount
        ? [savedOnMount.lat, savedOnMount.lng]
        : STATIONS_MAP_EMPTY_CENTER,
      restoreOnMount ? savedOnMount.zoom : STATIONS_MAP_EMPTY_ZOOM
    )
    tileLayersRef.current = addThemeTileLayersToMap(map, readThemeFromDocument())
    mapRef.current = map
    setMapInstance(map)
    registerActiveStationsMap(map, initialNetwork)
    if (restoreOnMount) {
      // Mark user ownership now, but do NOT lock didFit yet — the canvas often has
      // size 0 on the first setView, which can drop a deep zoom. tryApplyMapCamera
      // re-applies the exact saved zoom once layout/invalidateSize has a real size.
      userCameraRef.current = true
    }

    map.on('click', (event) => {
      if (addStationModeRef.current && onAddStationAtLocationRef.current) {
        onAddStationAtLocationRef.current(event.latlng.lat, event.latlng.lng)
        return
      }
      onStationClearRef.current()
      setAddStationMenu(null)
    })

    map.on('contextmenu', (event) => {
      L.DomEvent.preventDefault(event.originalEvent)
      if (!allowAddStationRef.current || !onAddStationAtLocationRef.current) return

      setAddStationMenu({
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY,
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      })
    })

    let cancelled = false

    const onWheel = (event: WheelEvent) => {
      if (cancelled) return

      // Armed: Leaflet scrollWheelZoom owns plain wheel (and pinch).
      if (wheelZoomArmedRef.current) return

      // Unarmed: Ctrl/Cmd+wheel (and trackpad pinch) still zoom; plain wheel scrolls the page.
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        event.stopPropagation()

        const delta = L.DomEvent.getWheelDelta(event)
        if (delta === 0) return

        const nextZoom = map.getZoom() + delta
        const point = map.mouseEventToContainerPoint(event)
        const latLng = map.containerPointToLatLng(point)
        map.setZoomAround(latLng, nextZoom)
        return
      }

      showUnarmedScrollHintRef.current()
    }

    const mapContainer = map.getContainer()
    mapContainer.addEventListener('wheel', onWheel, { passive: false })

    const onUserCameraChange = () => {
      if (programmaticMoveRef.current || cancelled) return
      const center = map.getCenter()
      // invalidateSize on the empty default must not claim user ownership.
      if (
        isNearEmptyDefaultMapView({
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom(),
        })
      ) {
        return
      }
      userCameraRef.current = true
      persistCurrentMapView(map, networkViewRef.current, { pinned: true })
    }

    map.on('dragend', onUserCameraChange)
    map.on('zoomend', onUserCameraChange)

    const refreshSize = () => {
      if (!mapRef.current || cancelled) return
      withProgrammaticMove(() => {
        map.invalidateSize({ pan: false })
      })
      tryApplyMapCameraRef.current()
    }
    window.addEventListener('resize', refreshSize)

    // Size may be 0 on first paint — invalidate once the canvas has layout.
    const rafId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(refreshSize)
    })

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      observer = new ResizeObserver(() => {
        if (cancelled) return
        window.requestAnimationFrame(refreshSize)
      })
      observer.observe(mapContainerRef.current)
    }

    // Prefer pinned session camera immediately (return from station details).
    tryApplyMapCameraRef.current()

    return () => {
      cancelled = true
      snapshotActiveStationsMapView()
      unregisterActiveStationsMap(map)
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', refreshSize)
      mapContainer.removeEventListener('wheel', onWheel)
      if (scrollZoomHintTimerRef.current !== null) {
        window.clearTimeout(scrollZoomHintTimerRef.current)
        scrollZoomHintTimerRef.current = null
      }
      if (programmaticClearTimerRef.current !== null) {
        window.clearTimeout(programmaticClearTimerRef.current)
        programmaticClearTimerRef.current = null
      }
      if (viewportMoveEndTimerRef.current !== null) {
        window.clearTimeout(viewportMoveEndTimerRef.current)
        viewportMoveEndTimerRef.current = null
      }
      observer?.disconnect()
      map.off('dragend', onUserCameraChange)
      map.off('zoomend', onUserCameraChange)
      if (markersLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markersLayerRef.current)
      }
      markersLayerRef.current = null
      markersByIdRef.current.clear()
      setMapInstance(null)
      map.remove()
      mapRef.current = null
      tileLayersRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount only

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!cullViewport) {
      setViewportBounds(null)
      return
    }

    setViewportBounds(map.getBounds())

    const onMoveEnd = () => {
      if (viewportMoveEndTimerRef.current !== null) {
        window.clearTimeout(viewportMoveEndTimerRef.current)
      }
      viewportMoveEndTimerRef.current = window.setTimeout(() => {
        viewportMoveEndTimerRef.current = null
        setViewportBounds(map.getBounds())
      }, VIEWPORT_MOVEEND_DEBOUNCE_MS)
    }

    map.on('moveend', onMoveEnd)
    map.on('zoomend', onMoveEnd)

    return () => {
      if (viewportMoveEndTimerRef.current !== null) {
        window.clearTimeout(viewportMoveEndTimerRef.current)
        viewportMoveEndTimerRef.current = null
      }
      map.off('moveend', onMoveEnd)
      map.off('zoomend', onMoveEnd)
    }
  }, [cullViewport, mapInstance])

  useEffect(() => {
    if (!cullViewport || !mapRef.current) return
    setViewportBounds(mapRef.current.getBounds())
  }, [cullViewport, networkView, mapInstance])

  useEffect(() => {
    if (!mapRef.current) return
    syncMarkers(mapRef.current)
  }, [syncMarkers])

  // Network tab: clear saved camera and require a fresh fit when data is ready.
  useEffect(() => {
    if (fitNonce === previousFitNonceRef.current) return
    previousFitNonceRef.current = fitNonce
    if (fitNonce === 0) return

    clearMapsMapViewSessionState(networkViewRef.current)
    userCameraRef.current = false
    didFitForReadyRef.current = false
    tryApplyMapCamera()
  }, [fitNonce, tryApplyMapCamera])

  // Restore pinned camera ASAP; otherwise fit once pins are ready. Retries while size is 0.
  useEffect(() => {
    if (!dataReady) {
      // Keep a successful pinned restore; only clear auto-fit so we can fit when pins arrive.
      if (!userCameraRef.current) {
        didFitForReadyRef.current = false
      }
      tryApplyMapCamera()
      return
    }
    tryApplyMapCamera()
  }, [dataReady, publishedStations, networkView, fitNonce, tryApplyMapCamera])

  useEffect(() => {
    markersByIdRef.current.forEach((marker, stationKey) => {
      const station = stationsByKeyRef.current.get(stationKey)
      if (!station) return
      applyMarkerStyle(
        marker,
        station,
        networkView,
        pendingNewStationKeys,
        stationKey === selectedStationId,
        mobileMarkers
      )

      if (timelineCutoff === null || station.sourceCollectionId !== LIGHTRAIL_COLLECTION_ID) {
        setMarkerTimelineVisibility(marker, true)
        return
      }

      const visible = isStationVisibleAtTimelineCutoff(
        station,
        timelineCutoff,
        timelineShowUndatedAtMax
      )
      setMarkerTimelineVisibility(marker, visible)
    })
    // Intentionally omit markerStations — cull refreshes must not restyle every pin
    // (setIcon/setStyle during/after zoom reads as jiggling).
  }, [
    selectedStationId,
    networkView,
    mobileMarkers,
    pendingNewStationKeys,
    timelineCutoff,
    timelineShowUndatedAtMax,
  ])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const refreshLegend = () => updateVisibleLegendNetworks(map)
    refreshLegend()
    map.on('moveend', refreshLegend)
    map.on('zoomend', refreshLegend)

    return () => {
      map.off('moveend', refreshLegend)
      map.off('zoomend', refreshLegend)
    }
  }, [updateVisibleLegendNetworks])

  useEffect(() => {
    if (!mapRef.current || !tileLayersRef.current) return
    tileLayersRef.current = swapThemeTileLayers(mapRef.current, tileLayersRef.current, themeKey)
  }, [themeKey])

  useEffect(() => {
    if (!mapInstance) return

    const arm = () => setWheelZoomArmedState(true)

    const onPointerDownCapture = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (mapStageRef.current?.contains(target)) {
        arm()
        return
      }
      setWheelZoomArmedState(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWheelZoomArmedState(false)
    }

    document.addEventListener('pointerdown', onPointerDownCapture, true)
    window.addEventListener('keydown', onKeyDown)
    mapInstance.on('dragstart', arm)

    return () => {
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
      window.removeEventListener('keydown', onKeyDown)
      mapInstance.off('dragstart', arm)
    }
  }, [mapInstance, setWheelZoomArmedState])

  useEffect(() => {
    if (!addStationMode) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onAddStationModeChangeRef.current?.(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addStationMode])

  return (
    <div
      className={[
        'stations-osm-map',
        addStationMode ? 'stations-osm-map--add-station-mode' : '',
        allowAddStation ? 'stations-osm-map--admin-add' : '',
        wheelZoomArmed ? 'stations-osm-map--wheel-zoom-armed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div ref={mapStageRef} className="stations-osm-map__stage">
        <div ref={mapContainerRef} className="stations-osm-map__canvas" aria-label="Map" />
        <MapZoomControls map={mapInstance} />
        {addStationMode && (
          <p className="stations-osm-map__add-mode-hint" role="status">
            Click the map to add a station · Esc to exit
          </p>
        )}
        {showScrollZoomHint && !addStationMode && (
          <p className="stations-osm-map__scroll-zoom-hint" role="status">
            Click the map to enable zoom
          </p>
        )}
        {allowAddStation && !addStationMode && (
          <MapAddStationContextMenu
            menu={addStationMenu}
            onClose={() => setAddStationMenu(null)}
            onAddStation={(latitude, longitude) => onAddStationAtLocation?.(latitude, longitude)}
          />
        )}
        {((networkView === 'all' && visibleLegendNetworks.length > 0) || hasVisiblePendingNew) && (
          <ul className="stations-osm-map__legend" aria-label="Map marker colours">
            {networkView === 'all' &&
              visibleLegendNetworks.map((collectionId) => (
                <li key={collectionId} className="stations-osm-map__legend-item">
                  <span
                    className="stations-osm-map__legend-dot"
                    style={{ backgroundColor: NETWORK_MAP_COLORS[collectionId] }}
                    aria-hidden="true"
                  />
                  <span className="stations-osm-map__legend-label">{NETWORK_LABELS[collectionId]}</span>
                </li>
              ))}
            {hasVisiblePendingNew && (
              <li className="stations-osm-map__legend-item">
                <span
                  className="stations-osm-map__legend-dot"
                  style={{ backgroundColor: PENDING_NEW_STATION_MAP_COLOR }}
                  aria-hidden="true"
                />
                <span className="stations-osm-map__legend-label">Unsaved new station</span>
              </li>
            )}
          </ul>
        )}
        {children ? (
          <MapSelectedCardDock stageRef={mapStageRef}>{children}</MapSelectedCardDock>
        ) : null}
      </div>
      <p className="stations-osm-map__attribution">
        <a href="https://leafletjs.com" target="_blank" rel="noreferrer">
          Leaflet
        </a>
        {' · '}
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
        {' · '}
        Style:{' '}
        <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">
          CC-BY-SA 2.0
        </a>{' '}
        <a href="https://www.openrailwaymap.org/" target="_blank" rel="noreferrer">
          OpenRailwayMap
        </a>
      </p>
    </div>
  )
}

export default StationsOsmMap
