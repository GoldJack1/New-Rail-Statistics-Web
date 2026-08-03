'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { WarningCircle } from '@phosphor-icons/react'

import { PageTopHeader } from '@/components/misc'
import BetaTag from '@/components/misc/BetaTag/BetaTag'
import { BUTBaseButton as Button, BUTWideButton } from '@/components/buttons'
import NetworkStationTabGroup from '@/components/cards/NetworkStationTabGroup/NetworkStationTabGroup'
import MapLiteModeGate from '@/components/maps/MapLiteModeGate'
import StationsMapSelectedCardFloat from '@/components/maps/StationsMapSelectedCardFloat'
import StationsMapTimeline from '@/components/maps/StationsMapTimeline'
import { LIGHTRAIL_COLLECTION_ID } from '@/utils/lightRailStationFields'
import {
  buildSuperTramTimelineSteps,
} from '@/utils/superTramTimeline'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { usePendingStationChanges } from '@/hooks/usePendingStationChanges'
import { useStationsMap } from '@/hooks/useStations'
import {
  ensureCollectionLoaded,
  mapStationDetailsUpgraded,
  resolveMapStationDetails,
} from '@/services/stationsDataService'
import { getStationMapKey, getStationNetworkCollectionId } from '@/utils/stationAreaSlug'
import { mergePendingNewStationsForMap } from '@/utils/pendingMapStations'
import { isValidStationCoordinate } from '@/utils/stationCoordinates'
import { countPendingChangesForCollection } from '@/utils/pendingChangesByCollection'
import { pathnameForReviewPendingSource } from '@/utils/reviewPendingNavigation'
import { useStationAdminMode } from '@/hooks/useStationAdminMode'
import { useMapsTimelineSession } from '@/hooks/useMapsTimelineSession'
import { useRestoreMapsSelectedStation } from '@/hooks/useRestoreMapsSelectedStation'
import { useDevicePerformanceTier } from '@/hooks/useDevicePerformanceTier'
import { writeMapsSelectedStationKey } from '@/utils/mapsSelectedStationStorage'
import { isNetworkCollection, NETWORK_COLLECTION_IDS, type NetworkViewFilter } from '@/constants/stationCollections'
import type { NewStationNavigationState } from '@/types/newStationNavigation'
import type { Station } from '@/types'
import { setNewStationNavigationState } from '@/utils/clientNavigationState'
import './StationsPageRefactored.css'
import './StationsMapPage.css'
import './StationsMapTimeline.css'

const StationsOsmMap = dynamic(() => import('@/components/maps/StationsOsmMap'), {
  ssr: false,
  loading: () => <div className="stations-osm-map stations-osm-map--loading" aria-busy="true" aria-label="Loading map" />,
})

const StationsMapPage: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routerLocation = { pathname, search: searchParams.toString() ? `?${searchParams}` : '' }
  const isAdminMode = useStationAdminMode()
  const { collectionId, networkView, setNetworkView } = useStationCollection()
  const { pendingChanges } = usePendingStationChanges()
  const { stations, stationsLoading, error, refetch, resolveStation, loadStationDetails, dataRevision } =
    useStationsMap()
  const { shouldGateAllNetworks, isLiteMode, enableFullMapOverride } = useDevicePerformanceTier(networkView)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [isAddStationMode, setIsAddStationMode] = useState(false)
  const [stationDetailsLoading, setStationDetailsLoading] = useState(false)
  const [mapFitNonce, setMapFitNonce] = useState(0)

  const showSuperTramTimeline = networkView === LIGHTRAIL_COLLECTION_ID

  const handleNetworkViewChange = useCallback(
    (view: NetworkViewFilter) => {
      if (view === networkView) return
      setNetworkView(view)
      setMapFitNonce((nonce) => nonce + 1)
    },
    [networkView, setNetworkView]
  )

  useEffect(() => {
    if (!isAdminMode) {
      setIsAddStationMode(false)
    }
  }, [isAdminMode])

  const loadStations = useCallback(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (!selectedStation) return
    const resolved = resolveStation(selectedStation)
    if (mapStationDetailsUpgraded(selectedStation, resolved)) {
      setSelectedStation(resolved)
    }
  }, [dataRevision, selectedStation, resolveStation])

  useEffect(() => {
    if (networkView === 'all') return
    if (!isNetworkCollection(networkView)) return
    void ensureCollectionLoaded(networkView, { detailLevel: 'list', force: false })
  }, [networkView])

  useEffect(() => {
    if (!selectedStation) return
    if (networkView === 'all') return
    const stationNetwork = getStationNetworkCollectionId(
      selectedStation,
      isNetworkCollection(networkView) ? networkView : undefined
    )
    if (stationNetwork !== networkView) {
      writeMapsSelectedStationKey(null)
      setSelectedStation(null)
    }
  }, [networkView, selectedStation])

  const handleStationSelect = useCallback(
    (station: Station) => {
      const selectionKey = getStationMapKey(station)
      writeMapsSelectedStationKey(selectionKey)
      setSelectedStation(resolveStation(station))
      setStationDetailsLoading(true)
      void loadStationDetails(station).finally(() => {
        setStationDetailsLoading(false)
        setSelectedStation((current) => {
          if (!current || getStationMapKey(current) !== selectionKey) return current
          return resolveMapStationDetails(current)
        })
      })
    },
    [loadStationDetails, resolveStation]
  )

  const handleStationClear = useCallback(() => {
    writeMapsSelectedStationKey(null)
    setSelectedStation(null)
  }, [])

  const handleAddStationAtLocation = useCallback(
    (latitude: number, longitude: number) => {
      const returnTo = '/admin/map'

      const state: NewStationNavigationState = {
        latitude,
        longitude,
        returnTo,
        ...(isNetworkCollection(networkView) ? { targetCollectionId: networkView } : {}),
      }

      setNewStationNavigationState(state)
      router.push('/admin/stations/new')
    },
    [router, networkView]
  )

  const firestoreMapStations = useMemo(
    () =>
      stations.filter((station) => {
        if (!isValidStationCoordinate(station.latitude, station.longitude)) return false
        if (networkView === 'all') return true
        return station.sourceCollectionId === networkView
      }),
    [stations, networkView]
  )

  const { stations: mapStations, pendingNewKeys } = useMemo(
    () => mergePendingNewStationsForMap(firestoreMapStations, pendingChanges, networkView),
    [firestoreMapStations, pendingChanges, networkView]
  )

  useRestoreMapsSelectedStation({
    dataReady: !stationsLoading,
    mapStations,
    selectedStation,
    onRestore: handleStationSelect,
  })

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

  const {
    timelineModeEnabled,
    setTimelineModeEnabled,
    timelineStepIndex,
    setTimelineStepIndex,
    timelinePlaying,
    setTimelinePlaying,
  } = useMapsTimelineSession(showSuperTramTimeline, superTramTimelineSteps.length)

  const timelineCutoff = useMemo(() => {
    if (!showSuperTramTimeline || superTramTimelineSteps.length === 0) return null
    const maxIndex = superTramTimelineSteps.length - 1
    const clamped = Math.max(0, Math.min(timelineStepIndex, maxIndex))
    return superTramTimelineSteps[clamped].cutoff
  }, [showSuperTramTimeline, superTramTimelineSteps, timelineStepIndex])

  const timelineShowUndatedAtMax = useMemo(() => {
    if (!showSuperTramTimeline || superTramTimelineSteps.length === 0) return true
    const maxIndex = superTramTimelineSteps.length - 1
    return timelineStepIndex >= maxIndex
  }, [showSuperTramTimeline, superTramTimelineSteps, timelineStepIndex])

  const activeTimelineCutoff = timelineModeEnabled ? timelineCutoff : null
  const activeTimelineShowUndatedAtMax = timelineModeEnabled ? timelineShowUndatedAtMax : true

  const selectedStationIsPending = Boolean(
    selectedStation && pendingNewKeys.has(getStationMapKey(selectedStation))
  )

  const pendingChangesCount = useMemo(() => {
    if (networkView === 'all') {
      return NETWORK_COLLECTION_IDS.reduce(
        (sum, id) => sum + countPendingChangesForCollection(pendingChanges, id),
        0
      )
    }
    return countPendingChangesForCollection(pendingChanges, collectionId)
  }, [pendingChanges, collectionId, networkView])

  const handleOpenPendingChanges = useCallback(() => {
    router.push(`/admin/stations/pending-review?from=${encodeURIComponent(pathnameForReviewPendingSource(routerLocation))}`)
  }, [router, routerLocation])

  if (error) {
    return (
      <div className="stations-page stations-map-page">
        <div className="stations-error">
          <WarningCircle className="error-icon" aria-hidden />
          <h2>Failed to load stations</h2>
          <p>{error}</p>
          <BUTWideButton onClick={loadStations} width="hug">
            Try Again
          </BUTWideButton>
        </div>
      </div>
    )
  }

  const dataReady = !stationsLoading
  const visibleMapStations = dataReady ? mapStations : []
  const visiblePublishedStations = dataReady ? firestoreMapStations : []

  return (
    <div className="stations-page stations-map-page">
      <PageTopHeader
        title="Map"
        titleAddon={<BetaTag />}
        subtitle={stationsLoading ? 'Loading stations…' : '\u00a0'}
      />
      <div className="stations-toolbar-band">
        {isAdminMode && (
          <div className="stations-map-page__admin-actions">
            <Button
              type="button"
              variant="wide"
              width="hug"
              colorVariant={isAddStationMode ? 'accent' : 'primary'}
              aria-pressed={isAddStationMode}
              onClick={() => setIsAddStationMode((active) => !active)}
            >
              Add station mode
            </Button>
            <Button
              type="button"
              variant="wide"
              width="hug"
              colorVariant={pendingChangesCount > 0 ? 'accent' : 'primary'}
              onClick={handleOpenPendingChanges}
            >
              Pending changes ({pendingChangesCount})
            </Button>
          </div>
        )}
        <div className="stations-network-tabs-wrap stations-network-tabs-wrap--toolbar">
          <NetworkStationTabGroup value={networkView} onChange={handleNetworkViewChange} />
        </div>
      </div>
      <div className="stations-content stations-map-page__content">
        <div className="stations-map-page__layout">
          <main className="stations-main">
            {shouldGateAllNetworks ? (
              <MapLiteModeGate
                onSelectNetwork={handleNetworkViewChange}
                onUseFullMap={enableFullMapOverride}
              />
            ) : (
              <StationsOsmMap
                stations={visibleMapStations}
                publishedStations={visiblePublishedStations}
                pendingNewStationKeys={pendingNewKeys}
                networkView={networkView}
                selectedStationId={selectedStation ? getStationMapKey(selectedStation) : null}
                onStationSelect={handleStationSelect}
                onStationClear={handleStationClear}
                allowAddStation={isAdminMode}
                addStationMode={isAddStationMode}
                onAddStationModeChange={setIsAddStationMode}
                onAddStationAtLocation={handleAddStationAtLocation}
                timelineCutoff={activeTimelineCutoff}
                timelineShowUndatedAtMax={activeTimelineShowUndatedAtMax}
                liteMode={isLiteMode}
                fitNonce={mapFitNonce}
                dataReady={dataReady}
              >
                <StationsMapSelectedCardFloat
                  station={selectedStation}
                  isPendingNew={selectedStationIsPending}
                  detailsLoading={stationDetailsLoading}
                />
              </StationsOsmMap>
            )}
          </main>
          {showSuperTramTimeline && !shouldGateAllNetworks && (
            <div className="stations-map-float stations-map-float--timeline">
              <StationsMapTimeline
                stations={superTramTimelineStations}
                stepIndex={timelineStepIndex}
                onStepIndexChange={setTimelineStepIndex}
                isPlaying={timelinePlaying}
                onPlayingChange={setTimelinePlaying}
                modeEnabled={timelineModeEnabled}
                onModeEnabledChange={setTimelineModeEnabled}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StationsMapPage