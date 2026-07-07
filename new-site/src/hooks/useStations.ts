import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { calculateStats } from '@/services/localData'
import {
  bootstrapStationsData,
  getCollectionError,
  getFullStationById,
  getMergedNetworkStations,
  getSandboxStations,
  invalidateStationsCache,
  isAnyNetworkCollectionLoading,
  isAnyNetworkCollectionRefreshing,
  isCollectionLoading,
  isCollectionRefreshing,
  loadAllNetworkStationsProgressive,
  getStationsStoreRevision,
  subscribeStationsData,
} from '@/services/stationsDataService'
import type { Station, StationStats, UseStationsReturn } from '@/types'
import { buildFullStationIndex, resolveFullStationFromCache } from '@/utils/mapLeanStation'

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

function buildStationsError(isSandbox: boolean): string | null {
  if (isSandbox) {
    return getCollectionError('newsandboxstations1')
  }
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
  refetch: () => void
  resolveStation: (station: Station) => Station
}

export const useStations = (): UseStationsReturn => {
  const { isSandbox, networkView } = useStationCollection()
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
    const fullStations = isSandbox ? getSandboxStations('full') : getMergedNetworkStations('full')
    const leanStations = isSandbox ? getSandboxStations('lean') : getMergedNetworkStations('lean')
    const stations = fullStations.length > 0 ? fullStations : leanStations
    const loading = isSandbox
      ? isCollectionLoading('newsandboxstations1')
      : isAnyNetworkCollectionLoading() && stations.length === 0
    const isRefreshing = isSandbox
      ? isCollectionRefreshing('newsandboxstations1')
      : isAnyNetworkCollectionRefreshing()
    const error = stations.length === 0 ? buildStationsError(isSandbox) : null
    const stats = calculateStats(stations)
    return { stations, loading, isRefreshing, error, stats }
  }, [hydrated, isSandbox, revision])

  const refetch = useCallback(() => {
    invalidateStationsCache()
    void bootstrapStationsData({ isSandbox, networkView, detailLevel: 'lean', force: true }).then(() =>
      loadAllNetworkStationsProgressive({ detailLevel: 'full', force: true })
    )
  }, [isSandbox, networkView])

  return useMemo(
    () => ({
      ...snapshot,
      refetch,
    }),
    [snapshot, refetch]
  )
}

export const useStationsMap = (): UseStationsMapReturn => {
  const { isSandbox, networkView } = useStationCollection()
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
    const leanStations = isSandbox ? getSandboxStations('lean') : getMergedNetworkStations('lean')
    const fullStations = isSandbox ? getSandboxStations('full') : getMergedNetworkStations('full')
    const stations = leanStations.length > 0 ? leanStations : fullStations
    const loading = isSandbox
      ? isCollectionLoading('newsandboxstations1')
      : isAnyNetworkCollectionLoading() && stations.length === 0
    const isRefreshing = isSandbox
      ? isCollectionRefreshing('newsandboxstations1')
      : isAnyNetworkCollectionRefreshing()
    const error = stations.length === 0 ? buildStationsError(isSandbox) : null
    return {
      stations,
      fullById: buildFullStationIndex(fullStations),
      loading,
      isRefreshing,
      error,
    }
  }, [hydrated, isSandbox, revision])

  const refetch = useCallback(() => {
    invalidateStationsCache()
    void bootstrapStationsData({ isSandbox, networkView, detailLevel: 'lean', force: true }).then(() =>
      loadAllNetworkStationsProgressive({ detailLevel: 'full', force: true })
    )
  }, [isSandbox, networkView])

  const resolveStation = useCallback(
    (station: Station) => {
      const full = getFullStationById(station.id)
      if (full) return full
      return resolveFullStationFromCache(station, snapshot.fullById)
    },
    [snapshot.fullById]
  )

  return useMemo(
    () => ({
      stations: snapshot.stations,
      loading: snapshot.loading,
      isRefreshing: snapshot.isRefreshing,
      error: snapshot.error,
      refetch,
      resolveStation,
    }),
    [snapshot, refetch, resolveStation]
  )
}

export { SERVER_STATION_SNAPSHOT }
