'use client'

/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useState } from 'react'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import {
  bootstrapStationsData,
  beginStationsInitialSync,
  endStationsInitialSync,
  getCollectionStations,
  invalidateStationsCache,
  loadAllNetworkStationsProgressive,
} from '@/services/stationsDataService'
import { NETWORK_COLLECTION_IDS } from '@/constants/stationCollections'
import {
  readDeviceCapabilityFromBrowser,
  resolveDevicePerformanceTier,
} from '@/utils/deviceCapability'

export const StationsCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { networkView } = useStationCollection()
  const [isLiteDataMode, setIsLiteDataMode] = useState(false)

  useEffect(() => {
    const input = readDeviceCapabilityFromBrowser()
    setIsLiteDataMode(resolveDevicePerformanceTier(input) === 'lite')
  }, [])

  const runBootstrap = useCallback(
    (force = false) => {
      beginStationsInitialSync()
      // Priority network first (list detail), then remaining collections in the background.
      // Avoid racing loadAllNetworkStationsProgressive in parallel — that pulled all.list.json.gz
      // (~480 KiB) before the active network could paint.
      void bootstrapStationsData({ networkView, detailLevel: 'list', force }).finally(() => {
        endStationsInitialSync()
      })
    },
    [networkView]
  )

  useEffect(() => {
    runBootstrap(false)
  }, [runBootstrap])

  useEffect(() => {
    const onRefetch = () => {
      invalidateStationsCache()
      beginStationsInitialSync()
      void bootstrapStationsData({ networkView, detailLevel: 'lean', force: true })
        .then(() => loadAllNetworkStationsProgressive({ detailLevel: 'list', force: true }))
        .then(() => {
          if (isLiteDataMode) return
          return loadAllNetworkStationsProgressive({ detailLevel: 'full', force: true })
        })
        .finally(() => {
          endStationsInitialSync()
        })
    }
    window.addEventListener('railstats-stations-refetch', onRefetch)
    return () => window.removeEventListener('railstats-stations-refetch', onRefetch)
  }, [isLiteDataMode, networkView])

  useEffect(() => {
    if (isLiteDataMode) return

    const runFullLoad = () => {
      const hasListData = NETWORK_COLLECTION_IDS.every(
        (id) => getCollectionStations(id, 'list').length > 0
      )
      const hasFullData = NETWORK_COLLECTION_IDS.every(
        (id) => getCollectionStations(id, 'full').length > 0
      )
      if (hasFullData || !hasListData) return
      void loadAllNetworkStationsProgressive({ detailLevel: 'full', force: false })
    }

    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(runFullLoad, { timeout: 15_000 })
      return () => window.cancelIdleCallback(handle)
    }

    const timer = window.setTimeout(runFullLoad, 6_000)
    return () => window.clearTimeout(timer)
  }, [isLiteDataMode, networkView])

  return <>{children}</>
}
