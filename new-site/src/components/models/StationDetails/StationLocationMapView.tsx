'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../../../components/maps/leafletDarkTiles.css'
import { MapZoomControls } from '../../../components/maps/MapZoomControls'
import { useTheme, readThemeFromDocument } from '../../../hooks/useTheme'
import { addThemeTileLayersToMap, swapThemeTileLayers, type MapTileLayerRefs } from '../../../utils/mapTileLayers'

// Precise circle marker: center is exactly the station coordinates (no anchor ambiguity)
const PRECISE_MARKER_OPTIONS: L.CircleMarkerOptions = {
  radius: 10,
  fillColor: '#2563eb',
  color: '#fff',
  weight: 2,
  fillOpacity: 0.95
}

interface StationLocationMapViewProps {
  latitude: number
  longitude: number
  /** Height in pixels */
  height?: number
}

/** Street-level default so the station fills the preview (not regional overview). */
const DEFAULT_ZOOM = 17

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

function mapStillMounted(map: L.Map | null, container: HTMLElement | null): map is L.Map {
  if (!map || !container) return false
  if (!container.isConnected) return false
  // Leaflet clears _leaflet_id on remove(); avoid invalidateSize on a dead map.
  if (!(container as HTMLElement & { _leaflet_id?: number })._leaflet_id) return false
  return map.getContainer() === container
}

export function StationLocationMapView({
  latitude,
  longitude,
  height
}: StationLocationMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const tileLayersRef = useRef<MapTileLayerRefs | null>(null)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const { theme } = useTheme()
  const themeKey = theme === 'dark' ? 'dark' : 'light'
  const center: L.LatLngTuple = [latitude, longitude]

  // Init map and precise circle marker once
  useEffect(() => {
    if (!mapRef.current || !isValidCoord(latitude, longitude)) {
      return
    }
    const map = L.map(mapRef.current, { zoomControl: false }).setView(center, DEFAULT_ZOOM)
    const layers = addThemeTileLayersToMap(map, readThemeFromDocument())
    tileLayersRef.current = layers
    const marker = L.circleMarker(center, PRECISE_MARKER_OPTIONS)
    marker.addTo(map)
    markerRef.current = marker
    mapInstanceRef.current = map
    setMapInstance(map)
    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
      tileLayersRef.current = null
      setMapInstance(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount only

  // Ensure Leaflet recalculates and repaints after responsive layout changes.
  // Re-apply DEFAULT_ZOOM after size settles — a 0-size init can leave the view wrong.
  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return

    const container = mapRef.current
    let cancelled = false
    let outerRaf = 0
    let innerRaf = 0

    const refreshSize = (forceDefaultZoom = false) => {
      if (cancelled) return
      const map = mapInstanceRef.current
      if (!mapStillMounted(map, container)) return
      try {
        map.invalidateSize({ pan: false, debounceMoveend: true })
        if (!isValidCoord(latitude, longitude)) return
        const zoom = forceDefaultZoom ? DEFAULT_ZOOM : map.getZoom()
        map.setView([latitude, longitude], zoom, { animate: false })
      } catch {
        // Tab unmount / layout races can leave Leaflet mid-transition without _leaflet_pos.
      }
    }

    const onWindowResize = () => refreshSize(false)

    outerRaf = window.requestAnimationFrame(() => {
      innerRaf = window.requestAnimationFrame(() => refreshSize(true))
    })
    const timeoutIds = [80, 200, 500].map((delay) =>
      window.setTimeout(() => refreshSize(true), delay)
    )

    window.addEventListener('resize', onWindowResize)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (cancelled) return
        window.requestAnimationFrame(() => refreshSize(false))
      })
      observer.observe(container)
      if (container.parentElement) {
        observer.observe(container.parentElement)
      }
    }

    return () => {
      cancelled = true
      window.cancelAnimationFrame(outerRaf)
      window.cancelAnimationFrame(innerRaf)
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
      window.removeEventListener('resize', onWindowResize)
      observer?.disconnect()
    }
  }, [latitude, longitude, height])

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayersRef.current) return
    tileLayersRef.current = swapThemeTileLayers(
      mapInstanceRef.current,
      tileLayersRef.current,
      themeKey
    )
  }, [themeKey])

  // When lat/lng change (e.g. from props), update map view and marker
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !isValidCoord(latitude, longitude)) return
    const latlng: L.LatLngExpression = [latitude, longitude]
    markerRef.current.setLatLng(latlng)
    mapInstanceRef.current.setView(latlng, DEFAULT_ZOOM)
  }, [latitude, longitude])

  if (!isValidCoord(latitude, longitude)) return null

  return (
    <>
      <div
        ref={mapRef}
        className="location-map-preview location-map-preview-osm"
        style={height ? { height: `${height}px` } : undefined}
        aria-label="Station location map"
      />
      <MapZoomControls map={mapInstance} />
    </>
  )
}

export default StationLocationMapView
