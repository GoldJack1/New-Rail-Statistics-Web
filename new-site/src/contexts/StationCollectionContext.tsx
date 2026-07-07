'use client'

/**
 * Phase 1 placeholder — same interface as the old site's
 * `src/contexts/StationCollectionContext.tsx`, but without any Firestore
 * calls (`setStationCollectionName` etc. are Phase 2 / firebase.ts). State is
 * kept in-memory + localStorage only, matching Phase 1's "no live Firebase
 * data" scope.
 */
import React, { createContext, useContext, useCallback, useState, useMemo } from 'react'
import {
  deriveCollectionId,
  DEFAULT_NETWORK_COLLECTION_ID,
  DEFAULT_NETWORK_VIEW,
  isNetworkCollection,
  isNetworkViewFilter,
  STATION_NETWORK_STORAGE_KEY,
  STATION_NETWORK_VIEW_STORAGE_KEY,
  STATION_SANDBOX_STORAGE_KEY,
  type NetworkCollectionId,
  type NetworkViewFilter,
  type StationCollectionId,
} from '@/constants/stationCollections'

function readStoredNetworkId(): NetworkCollectionId {
  if (typeof window === 'undefined') return DEFAULT_NETWORK_COLLECTION_ID
  const raw = window.localStorage.getItem(STATION_NETWORK_STORAGE_KEY)
  return raw && isNetworkCollection(raw) ? raw : DEFAULT_NETWORK_COLLECTION_ID
}

function readStoredNetworkView(): NetworkViewFilter {
  if (typeof window === 'undefined') return DEFAULT_NETWORK_VIEW
  const raw = window.localStorage.getItem(STATION_NETWORK_VIEW_STORAGE_KEY)
  return raw && isNetworkViewFilter(raw) ? raw : DEFAULT_NETWORK_VIEW
}

function readStoredSandboxMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STATION_SANDBOX_STORAGE_KEY) === 'true'
}

interface StationCollectionContextValue {
  networkView: NetworkViewFilter
  setNetworkView: (view: NetworkViewFilter) => void
  networkId: NetworkCollectionId
  setNetworkId: (id: NetworkCollectionId) => void
  isSandbox: boolean
  setSandbox: (enabled: boolean) => void
  collectionId: StationCollectionId
  setCollectionId: (id: StationCollectionId) => void
}

const StationCollectionContext = createContext<StationCollectionContextValue | null>(null)

export const StationCollectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkView, setNetworkViewState] = useState<NetworkViewFilter>(readStoredNetworkView)
  const [networkId, setNetworkIdState] = useState<NetworkCollectionId>(readStoredNetworkId)
  const [isSandbox, setSandboxState] = useState<boolean>(readStoredSandboxMode)

  const collectionId = useMemo(
    () => deriveCollectionId(networkView, networkId, isSandbox),
    [networkView, networkId, isSandbox]
  )

  const setNetworkView = useCallback((view: NetworkViewFilter) => {
    setNetworkViewState(view)
    if (typeof window !== 'undefined') window.localStorage.setItem(STATION_NETWORK_VIEW_STORAGE_KEY, view)
    if (view !== 'all') {
      setNetworkIdState(view)
      if (typeof window !== 'undefined') window.localStorage.setItem(STATION_NETWORK_STORAGE_KEY, view)
    }
  }, [])

  const setNetworkId = useCallback((id: NetworkCollectionId) => {
    setNetworkIdState(id)
    setNetworkViewState(id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STATION_NETWORK_STORAGE_KEY, id)
      window.localStorage.setItem(STATION_NETWORK_VIEW_STORAGE_KEY, id)
    }
  }, [])

  const setSandbox = useCallback((enabled: boolean) => {
    setSandboxState(enabled)
    if (typeof window !== 'undefined') window.localStorage.setItem(STATION_SANDBOX_STORAGE_KEY, String(enabled))
  }, [])

  const setCollectionId = useCallback(
    (id: StationCollectionId) => {
      if (id === 'newsandboxstations1') {
        setSandbox(true)
        return
      }
      setSandbox(false)
      setNetworkId(id)
    },
    [setNetworkId, setSandbox]
  )

  const value = useMemo<StationCollectionContextValue>(
    () => ({ networkView, setNetworkView, networkId, setNetworkId, isSandbox, setSandbox, collectionId, setCollectionId }),
    [networkView, setNetworkView, networkId, setNetworkId, isSandbox, setSandbox, collectionId, setCollectionId]
  )

  return <StationCollectionContext.Provider value={value}>{children}</StationCollectionContext.Provider>
}

export const useStationCollection = (): StationCollectionContextValue => {
  const ctx = useContext(StationCollectionContext)
  if (!ctx) {
    throw new Error('useStationCollection must be used within StationCollectionProvider')
  }
  return ctx
}
