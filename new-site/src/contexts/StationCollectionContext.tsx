'use client'

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useState, useEffect, useMemo } from 'react'
import type { NetworkCollectionId, NetworkViewFilter, StationCollectionId } from '@/constants/stationCollections'
import {
  DEFAULT_NETWORK_COLLECTION_ID,
  DEFAULT_NETWORK_VIEW,
  SANDBOX_COLLECTION_ID,
  deriveCollectionId,
  isNetworkCollection,
  STATION_COLLECTION_STORAGE_KEY,
  STATION_SANDBOX_STORAGE_KEY,
} from '@/constants/stationCollections'
import {
  getStationNetworkId,
  setStationNetworkId,
  getStationNetworkView,
  setStationNetworkView,
  setStationCollectionName,
} from '@/services/firebase'

interface StationCollectionContextValue {
  networkView: NetworkViewFilter
  setNetworkView: (view: NetworkViewFilter) => void
  networkId: NetworkCollectionId
  setNetworkId: (id: NetworkCollectionId) => void
  /** Active Firestore collection for edits (All uses last single-network). */
  collectionId: StationCollectionId
  /** @deprecated Use networkView / networkId */
  setCollectionId: (id: StationCollectionId) => void
}

const StationCollectionContext = createContext<StationCollectionContextValue | null>(null)

export const StationCollectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkView, setNetworkViewState] = useState<NetworkViewFilter>(DEFAULT_NETWORK_VIEW)
  const [networkId, setNetworkIdState] = useState<NetworkCollectionId>(DEFAULT_NETWORK_COLLECTION_ID)

  useEffect(() => {
    setNetworkViewState(getStationNetworkView())
    setNetworkIdState(getStationNetworkId())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const legacyCollection = window.localStorage.getItem(STATION_COLLECTION_STORAGE_KEY)
      if (legacyCollection === SANDBOX_COLLECTION_ID) {
        window.localStorage.setItem(STATION_COLLECTION_STORAGE_KEY, DEFAULT_NETWORK_COLLECTION_ID)
      }
      window.localStorage.removeItem(STATION_SANDBOX_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const collectionId = useMemo(
    () => deriveCollectionId(networkView, networkId),
    [networkView, networkId]
  )

  useEffect(() => {
    setStationCollectionName(collectionId)
  }, [collectionId])

  const setNetworkView = useCallback((view: NetworkViewFilter) => {
    setNetworkViewState(view)
    setStationNetworkView(view)
    if (view !== 'all') {
      setNetworkIdState(view)
    }
  }, [])

  const setNetworkId = useCallback((id: NetworkCollectionId) => {
    setNetworkIdState(id)
    setNetworkViewState(id)
    setStationNetworkId(id)
    setStationNetworkView(id)
  }, [])

  const setCollectionId = useCallback(
    (id: StationCollectionId) => {
      if (id === SANDBOX_COLLECTION_ID || !isNetworkCollection(id)) return
      setNetworkId(id)
    },
    [setNetworkId]
  )

  return (
    <StationCollectionContext.Provider
      value={{
        networkView,
        setNetworkView,
        networkId,
        setNetworkId,
        collectionId,
        setCollectionId,
      }}
    >
      {children}
    </StationCollectionContext.Provider>
  )
}

export const useStationCollection = (): StationCollectionContextValue => {
  const ctx = useContext(StationCollectionContext)
  if (!ctx) {
    throw new Error('useStationCollection must be used within StationCollectionProvider')
  }
  return ctx
}
