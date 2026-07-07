'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { PageTopHeader } from '@/components/misc'
import BetaTag from '@/components/misc/BetaTag/BetaTag'
import { BUTWideButton } from '@/components/buttons'
import NetworkStationTabGroup from '@/components/cards/NetworkStationTabGroup/NetworkStationTabGroup'
import StationsMapSelectedPanel from '@/components/maps/StationsMapSelectedPanel'
import StationsMapTimeline from '@/components/maps/StationsMapTimeline'
import { LIGHTRAIL_COLLECTION_ID } from '@/utils/lightRailStationFields'
import { buildSuperTramTimelineSteps } from '@/utils/superTramTimeline'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { getStationMapKey } from '@/utils/stationAreaSlug'
import { isValidStationCoordinate } from '@/utils/stationCoordinates'
import type { Station } from '@/types'
import './StationsPageRefactored.css'
import './StationsMapPage.css'

// Leaflet touches `window`/`document` at import time — must be client-only, no SSR.
const StationsOsmMap = dynamic(() => import('@/components/maps/StationsOsmMap'), {
  ssr: false,
  loading: () => (
    <div className="stations-osm-map" aria-hidden="true">
      <div className="stations-osm-map__canvas" />
    </div>
  ),
})

const MOBILE_MAP_MEDIA = '(max-width: 639px)'

/**
 * Phase 1 placeholder (MIGRATION_PLAN.md §5.7): wired for real with Leaflet + OSM
 * tiles (via the `/api/osm-tile` Route Handler) and a curated sample dataset with
 * real coordinates (`public/data/stations-map-sample.json` — the shipped
 * `stations.json`/`stations-sample.json` have no usable lat/long, see report).
 * Live Firestore data and the admin add/edit overlay (`/admin/map`) are Phase 2.
 */
export default function StationsMapPage() {
  const { networkView, setNetworkView } = useStationCollection()
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [timelineStepIndex, setTimelineStepIndex] = useState(0)
  const [timelinePlaying, setTimelinePlaying] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  const showSuperTramTimeline = networkView === LIGHTRAIL_COLLECTION_ID

  const loadStations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/data/stations-map-sample.json')
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = (await res.json()) as Station[]
      setStations(data)
    } catch (err) {
      console.error('Failed to load sample stations for map:', err)
      setError('Unable to load sample station data for the map. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStations()
  }, [loadStations])

  useEffect(() => {
    if (!selectedStation) return
    if (networkView === 'all') return
    if (selectedStation.sourceCollectionId !== networkView) {
      setSelectedStation(null)
    }
  }, [networkView, selectedStation])

  useEffect(() => {
    if (!selectedStation) return
    if (!window.matchMedia(MOBILE_MAP_MEDIA).matches) return

    const frameId = window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [selectedStation])

  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station)
  }, [])

  const handleStationClear = useCallback(() => {
    setSelectedStation(null)
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

  const superTramTimelineStations = useMemo(
    () =>
      showSuperTramTimeline
        ? mapStations.filter((station) => station.sourceCollectionId === LIGHTRAIL_COLLECTION_ID)
        : [],
    [mapStations, showSuperTramTimeline]
  )

  const superTramTimelineSteps = useMemo(
    () => buildSuperTramTimelineSteps(superTramTimelineStations),
    [superTramTimelineStations]
  )

  const timelineCutoffMs = useMemo(() => {
    if (!showSuperTramTimeline || superTramTimelineSteps.length === 0) return null
    const maxIndex = superTramTimelineSteps.length - 1
    const clamped = Math.max(0, Math.min(timelineStepIndex, maxIndex))
    return superTramTimelineSteps[clamped].cutoffMs
  }, [showSuperTramTimeline, superTramTimelineSteps, timelineStepIndex])

  const timelineShowUndatedAtMax = useMemo(() => {
    if (!showSuperTramTimeline || superTramTimelineSteps.length === 0) return true
    const maxIndex = superTramTimelineSteps.length - 1
    return timelineStepIndex >= maxIndex
  }, [showSuperTramTimeline, superTramTimelineSteps, timelineStepIndex])

  useEffect(() => {
    if (!showSuperTramTimeline) {
      setTimelinePlaying(false)
      return
    }
    setTimelineStepIndex(Math.max(0, superTramTimelineSteps.length - 1))
  }, [showSuperTramTimeline, superTramTimelineSteps.length])

  if (loading) {
    return (
      <div className="stations-page stations-map-page">
        <div className="stations-loading">
          <div className="loading-spinner" aria-hidden="true" />
          <p>Loading sample station data…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stations-page stations-map-page">
        <div className="stations-error">
          <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2>Failed to load stations</h2>
          <p>{error}</p>
          <BUTWideButton onClick={() => void loadStations()} width="hug">
            Try Again
          </BUTWideButton>
        </div>
      </div>
    )
  }

  return (
    <div className="stations-page stations-map-page">
      <PageTopHeader title="Map" titleAddon={<BetaTag />} subtitle="Phase 1 preview — sample stations, not live data." />
      <div className="stations-toolbar-band">
        <div className="stations-map-page__toolbar-row">
          <div className="stations-network-tabs-wrap stations-network-tabs-wrap--toolbar">
            <NetworkStationTabGroup value={networkView} onChange={setNetworkView} />
          </div>
        </div>
      </div>
      <div className="stations-content stations-map-page__content">
        <div className="stations-map-page__layout">
          <main className="stations-main">
            <StationsOsmMap
              stations={mapStations}
              publishedStations={mapStations}
              networkView={networkView}
              selectedStationId={selectedStation ? getStationMapKey(selectedStation) : null}
              onStationSelect={handleStationSelect}
              onStationClear={handleStationClear}
              allowAddStation={false}
              timelineCutoffMs={timelineCutoffMs}
              timelineShowUndatedAtMax={timelineShowUndatedAtMax}
            />
          </main>
          <aside ref={panelRef} className="stations-map-side-panel" aria-label="Map details">
            {showSuperTramTimeline && (
              <StationsMapTimeline
                stations={superTramTimelineStations}
                stepIndex={timelineStepIndex}
                onStepIndexChange={setTimelineStepIndex}
                isPlaying={timelinePlaying}
                onPlayingChange={setTimelinePlaying}
              />
            )}
            <StationsMapSelectedPanel station={selectedStation} isPendingNew={false} />
          </aside>
        </div>
      </div>
    </div>
  )
}
