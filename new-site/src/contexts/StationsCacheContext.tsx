'use client'

/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import {
  bootstrapStationsData,
  beginStationsInitialSync,
  endStationsInitialSync,
  getCollectionStations,
  invalidateStationsCache,
  loadAllNetworkStationsProgressive,
} from '@/services/stationsDataService'
import {
  NETWORK_COLLECTION_IDS,
  isNetworkCollection,
  type NetworkViewFilter,
} from '@/constants/stationCollections'
import {
  readDeviceCapabilityFromBrowser,
  resolveDevicePerformanceTier,
} from '@/utils/deviceCapability'
import { getCollectionIdFromNetworkUrlSlug } from '@/utils/stationAreaSlug'
import {
  isPublicStationDetailPath,
  isPublicStationsListPath,
} from '@/utils/publicStationsPaths'

/** Prefer the network in the URL so detail pages don't wait on the wrong collection. */
function getPriorityNetworkFromPath(pathname: string): NetworkViewFilter | null {
  const parts = pathname.split('/').filter(Boolean)
  let collectionId = null as ReturnType<typeof getCollectionIdFromNetworkUrlSlug>
  if (parts[0] === 'stations' && parts[1] && parts[1] !== 'map') {
    collectionId = getCollectionIdFromNetworkUrlSlug(parts[1])
  } else if (
    parts[0] === 'admin' &&
    parts[1] === 'stations' &&
    parts[2] &&
    parts[2] !== 'new' &&
    parts[2] !== 'pending-review'
  ) {
    collectionId = getCollectionIdFromNetworkUrlSlug(parts[2])
  }
  return collectionId && isNetworkCollection(collectionId) ? collectionId : null
}

export const StationsCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { networkView } = useStationCollection()
  const pathname = usePathname() ?? '/'
  const [isLiteDataMode, setIsLiteDataMode] = useState(false)
  const isPublicStationsList = isPublicStationsListPath(pathname)
  const isPublicStationDetail = isPublicStationDetailPath(pathname)
  const urlPriorityNetwork = useMemo(() => getPriorityNetworkFromPath(pathname), [pathname])
  const bootstrapNetworkView: NetworkViewFilter = urlPriorityNetwork ?? networkView

  useEffect(() => {
    const input = readDeviceCapabilityFromBrowser()
    setIsLiteDataMode(resolveDevicePerformanceTier(input) === 'lite')
  }, [])

  const runBootstrap = useCallback(
    (force = false) => {
      beginStationsInitialSync()
      // Detail pages: load only the URL network list (no progressive other networks / full).
      // List page: priority network first, then remaining in background.
      void bootstrapStationsData({
        networkView: bootstrapNetworkView,
        detailLevel: 'list',
        force,
        priorityOnly: isPublicStationDetail,
      }).finally(() => {
        endStationsInitialSync()
      })
    },
    [bootstrapNetworkView, isPublicStationDetail]
  )

  useEffect(() => {
    runBootstrap(false)
  }, [runBootstrap])

  useEffect(() => {
    const onRefetch = () => {
      invalidateStationsCache()
      beginStationsInitialSync()
      void bootstrapStationsData({
        networkView: bootstrapNetworkView,
        detailLevel: 'lean',
        force: true,
        priorityOnly: isPublicStationDetail,
      })
        .then(() => {
          if (isPublicStationDetail) {
            return bootstrapStationsData({
              networkView: bootstrapNetworkView,
              detailLevel: 'list',
              force: true,
              priorityOnly: true,
            })
          }
          return loadAllNetworkStationsProgressive({ detailLevel: 'list', force: true })
        })
        .then(() => {
          if (isLiteDataMode || isPublicStationsList || isPublicStationDetail) return
          return loadAllNetworkStationsProgressive({ detailLevel: 'full', force: true })
        })
        .finally(() => {
          endStationsInitialSync()
        })
    }
    window.addEventListener('railstats-stations-refetch', onRefetch)
    return () => window.removeEventListener('railstats-stations-refetch', onRefetch)
  }, [bootstrapNetworkView, isLiteDataMode, isPublicStationDetail, isPublicStationsList])

  useEffect(() => {
    // Public list/detail only need list-level rows; skip full detail preload.
    if (isLiteDataMode || isPublicStationsList || isPublicStationDetail) return

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
  }, [isLiteDataMode, isPublicStationsList, isPublicStationDetail, bootstrapNetworkView])

  return <>{children}</>
}
