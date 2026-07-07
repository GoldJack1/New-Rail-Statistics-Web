'use client'

/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useState } from 'react'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import {
  bootstrapStationsData,
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
  const { isSandbox, networkView } = useStationCollection()
  const [isLiteDataMode, setIsLiteDataMode] = useState(false)

  useEffect(() => {
    const input = readDeviceCapabilityFromBrowser()
    setIsLiteDataMode(resolveDevicePerformanceTier(input) === 'lite')
  }, [])

  const runBootstrap = useCallback(
    (force = false) => {
      void bootstrapStationsData({ isSandbox, networkView, detailLevel: 'lean', force }).then(() => {
        if (isSandbox) return
        void loadAllNetworkStationsProgressive({ detailLevel: 'list', force: false })
      })
    },
    [isSandbox, networkView]
  )

  useEffect(() => {
    runBootstrap(false)
  }, [runBootstrap])

  useEffect(() => {
    const onRefetch = () => {
      invalidateStationsCache()
      void bootstrapStationsData({ isSandbox, networkView, detailLevel: 'lean', force: true }).then(() => {
        void loadAllNetworkStationsProgressive({ detailLevel: 'list', force: true })
        if (isLiteDataMode) return
        void loadAllNetworkStationsProgressive({ detailLevel: 'full', force: true })
      })
    }
    window.addEventListener('railstats-stations-refetch', onRefetch)
    return () => window.removeEventListener('railstats-stations-refetch', onRefetch)
  }, [isLiteDataMode, isSandbox, networkView])

  useEffect(() => {
    if (isSandbox || isLiteDataMode) return

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
  }, [isLiteDataMode, isSandbox, networkView])

  return <>{children}</>
}
