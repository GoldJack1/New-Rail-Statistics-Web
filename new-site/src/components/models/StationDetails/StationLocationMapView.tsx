'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../../../components/maps/leafletDarkTiles.css'
import { useTheme } from '../../../hooks/useTheme'
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

const DEFAULT_ZOOM = 15

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

export function StationLocationMapView({
  latitude,
  longitude,
  height
}: StationLocationMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const tileLayersRef = useRef<MapTileLayerRefs | null>(null)
  const { theme } = useTheme()
  const themeKey = theme === 'dark' ? 'dark' : 'light'
  const center: L.LatLngTuple = [latitude, longitude]

  // Init map and precise circle marker once
  useEffect(() => {
    if (!mapRef.current || !isValidCoord(latitude, longitude)) {
      return
    }
    const map = L.map(mapRef.current).setView(center, DEFAULT_ZOOM)
    const layers = addThemeTileLayersToMap(map, themeKey)
    tileLayersRef.current = layers
    const marker = L.circleMarker(center, PRECISE_MARKER_OPTIONS)
    marker.addTo(map)
    markerRef.current = marker
    mapInstanceRef.current = map
    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
      tileLayersRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount only

  // Ensure Leaflet recalculates and repaints after responsive layout changes.
  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return

    const map = mapInstanceRef.current
    const container = mapRef.current

    const refreshSize = () => {
      if (!mapInstanceRef.current) return
      map.invalidateSize({ pan: false, debounceMoveend: true })
      map.setView([latitude, longitude], map.getZoom(), { animate: false })
    }

    const rafId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(refreshSize)
    })
    const timeoutIds = [80, 200, 500].map((delay) => window.setTimeout(refreshSize, delay))

    window.addEventListener('resize', refreshSize)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        window.requestAnimationFrame(refreshSize)
      })
      observer.observe(container)
      if (container.parentElement) {
        observer.observe(container.parentElement)
      }
    }

    return () => {
      window.cancelAnimationFrame(rafId)
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
      window.removeEventListener('resize', refreshSize)
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
    mapInstanceRef.current.setView(latlng, mapInstanceRef.current.getZoom())
  }, [latitude, longitude])

  if (!isValidCoord(latitude, longitude)) return null

  return (
    <div
      ref={mapRef}
      className="location-map-preview location-map-preview-osm"
      style={height ? { height: `${height}px` } : undefined}
      aria-label="Station location map"
    />
  )
}

export default StationLocationMapView
