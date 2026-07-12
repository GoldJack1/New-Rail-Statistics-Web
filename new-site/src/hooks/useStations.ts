import { useCallback, useEffect, useMemo, useState, useDeferredValue, useSyncExternalStore } from 'react'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { calculateStats } from '@/services/localData'
import {
  bootstrapStationsData,
  ensureMapStationDetailsLoaded,
  getCollectionError,
  getMergedNetworkStations,
  getMergedNetworkStationsForDisplay,
  getMergedNetworkStationDetails,
  invalidateStationsCache,
  isAnyNetworkCollectionLoading,
  isAnyNetworkCollectionRefreshing,
  isStationsInitialSyncPending,
  beginStationsInitialSync,
  endStationsInitialSync,
  loadAllNetworkStationsProgressive,
  resolveMapStationDetails,
  getStationsStoreRevision,
  subscribeStationsData,
} from '@/services/stationsDataService'
import type { Station, StationStats, UseStationsReturn } from '@/types'
import { buildFullStationIndex } from '@/utils/mapLeanStation'

const SERVER_STATION_SNAPSHOT = {
  stations: [] as Station[],
  loading: true,
  isRefreshing: false,
  error: null as string | null,
  stats: {
    totalStations: 0,
    withCoordinates: 0,
    withTOC: 0,
    withPassengers: 0,
  } satisfies StationStats,
}

function buildStationsError(): string | null {
  for (const message of [
    getCollectionError('stations_gbnr'),
    getCollectionError('stations_nitranslink'),
    getCollectionError('stations_roiirerail'),
    getCollectionError('stations_gbheritage'),
    getCollectionError('lightrail_GBSHEFFSUPERTRAM'),
  ]) {
    if (message) return message
  }
  return null
}

export interface UseStationsMapReturn {
  stations: Station[]
  loading: boolean
  isRefreshing: boolean
  error: string | null
  dataRevision: number
  refetch: () => void
  resolveStation: (station: Station) => Station
  loadStationDetails: (station: Station) => Promise<void>
}

export const useStations = (): UseStationsReturn => {
  const { networkView } = useStationCollection()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const revision = useSyncExternalStore(
    subscribeStationsData,
    getStationsStoreRevision,
    () => 0
  )

  const snapshot = useMemo(() => {
    if (!hydrated) return SERVER_STATION_SNAPSHOT
    const stations = getMergedNetworkStationsForDisplay()
    const loading =
      isStationsInitialSyncPending() ||
      (isAnyNetworkCollectionLoading() && stations.length === 0)
    const isRefreshing = isAnyNetworkCollectionRefreshing()
    const error = stations.length === 0 ? buildStationsError() : null
    return { stations, loading, isRefreshing, error }
  }, [hydrated, revision])

  const deferredStations = useDeferredValue(snapshot.stations)
  const stats = useMemo(() => calculateStats(deferredStations), [deferredStations])

  const refetch = useCallback(() => {
    invalidateStationsCache()
    beginStationsInitialSync()
    void bootstrapStationsData({ networkView, detailLevel: 'lean', force: true })
      .then(() => loadAllNetworkStationsProgressive({ detailLevel: 'list', force: true }))
      .then(() => loadAllNetworkStationsProgressive({ detailLevel: 'full', force: true }))
      .finally(() => endStationsInitialSync())
  }, [networkView])

  return useMemo(
    () => ({
      stations: snapshot.stations,
      loading: snapshot.loading,
      isRefreshing: snapshot.isRefreshing,
      error: snapshot.error,
      stats,
      refetch,
    }),
    [snapshot, stats, refetch]
  )
}

export const useStationsMap = (): UseStationsMapReturn => {
  const { networkView } = useStationCollection()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const revision = useSyncExternalStore(
    subscribeStationsData,
    getStationsStoreRevision,
    () => 0
  )

  const snapshot = useMemo(() => {
    if (!hydrated) {
      return {
        stations: SERVER_STATION_SNAPSHOT.stations,
        fullById: new Map<string, Station>(),
        loading: true,
        isRefreshing: false,
        error: null,
      }
    }
    const leanStations = getMergedNetworkStations('lean')
    const fullStations = getMergedNetworkStationDetails()
    const stations = leanStations.length > 0 ? leanStations : fullStations
    const loading =
      isStationsInitialSyncPending() ||
      (isAnyNetworkCollectionLoading() && stations.length === 0)
    const isRefreshing = isAnyNetworkCollectionRefreshing()
    const error = stations.length === 0 ? buildStationsError() : null
    return {
      stations,
      fullById: buildFullStationIndex(fullStations),
      loading,
      isRefreshing,
      error,
    }
  }, [hydrated, revision])

  const refetch = useCallback(() => {
    invalidateStationsCache()
    beginStationsInitialSync()
    void bootstrapStationsData({ networkView, detailLevel: 'lean', force: true })
      .then(() => loadAllNetworkStationsProgressive({ detailLevel: 'list', force: true }))
      .then(() => loadAllNetworkStationsProgressive({ detailLevel: 'full', force: true }))
      .finally(() => endStationsInitialSync())
  }, [networkView])

  const resolveStation = useCallback(
    (station: Station) => resolveMapStationDetails(station),
    [revision]
  )

  const loadStationDetails = useCallback(async (station: Station) => {
    await ensureMapStationDetailsLoaded(station)
  }, [])

  return useMemo(
    () => ({
      stations: snapshot.stations,
      loading: snapshot.loading,
      isRefreshing: snapshot.isRefreshing,
      error: snapshot.error,
      dataRevision: revision,
      refetch,
      resolveStation,
      loadStationDetails,
    }),
    [snapshot, revision, refetch, resolveStation, loadStationDetails]
  )
}

export { SERVER_STATION_SNAPSHOT }
