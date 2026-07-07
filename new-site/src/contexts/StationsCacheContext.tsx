'use client'

/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect } from 'react'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import {
  bootstrapStationsData,
  invalidateStationsCache,
  loadAllNetworkStationsProgressive,
} from '@/services/stationsDataService'

export const StationsCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSandbox, networkView } = useStationCollection()

  const runBootstrap = useCallback(
    (force = false) => {
      void bootstrapStationsData({ isSandbox, networkView, detailLevel: 'lean', force })
    },
    [isSandbox, networkView]
  )

  useEffect(() => {
    runBootstrap(false)
  }, [runBootstrap])

  useEffect(() => {
    const onRefetch = () => {
      invalidateStationsCache()
      void bootstrapStationsData({ isSandbox, networkView, detailLevel: 'lean', force: true }).then(() =>
        loadAllNetworkStationsProgressive({ detailLevel: 'full', force: true })
      )
    }
    window.addEventListener('railstats-stations-refetch', onRefetch)
    return () => window.removeEventListener('railstats-stations-refetch', onRefetch)
  }, [isSandbox, networkView])

  useEffect(() => {
    if (isSandbox) return
    void loadAllNetworkStationsProgressive({ detailLevel: 'full', force: false })
  }, [isSandbox, networkView])

  return <>{children}</>
}
