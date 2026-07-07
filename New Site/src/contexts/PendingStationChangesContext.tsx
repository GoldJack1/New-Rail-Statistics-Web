'use client'

/**
 * Phase 1 placeholder. The real version (old site's
 * `src/contexts/PendingStationChangesContext.tsx`) syncs a Firestore-backed
 * "scheduled publish job" via `ScheduledServerJobFirestoreSync` — that's a
 * Phase 2 concern (admin editing workflows, out of scope per §5.11). This
 * stub keeps pending changes in localStorage only (no server sync) so
 * components that read `pendingChanges` (e.g. `StationsMapSelectedPanel`)
 * compile and render unchanged; nothing in Phase 1 actually writes to it.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import type { SandboxStationDoc, Station } from '@/types'
import type { StationCollectionId } from '@/constants/stationCollections'

const PENDING_CHANGES_STORAGE_KEY = 'railstatistics-pending-station-changes-v1'

export interface PendingChangeEntry {
  targetCollectionId: StationCollectionId
  original: Station
  updated: Partial<Station>
  sandboxUpdated?: Partial<SandboxStationDoc> | null
  sandboxOriginal?: Partial<SandboxStationDoc> | null
  isNew?: boolean
}

interface PendingStationChangesContextValue {
  pendingChanges: Record<string, PendingChangeEntry>
  upsertPendingChange: (
    station: Station,
    updated: Partial<Station>,
    targetCollectionId: StationCollectionId,
    sandboxUpdated?: Partial<SandboxStationDoc> | null,
    sandboxOriginal?: Partial<SandboxStationDoc> | null
  ) => void
  addNewPendingStation: (
    stationId: string,
    updated: Partial<Station>,
    targetCollectionId: StationCollectionId,
    sandboxUpdated?: Partial<SandboxStationDoc> | null
  ) => void
  clearPendingChange: (stationId: string) => void
  clearAllPendingChanges: () => void
  clearPendingChangesForIds: (stationIds: string[]) => void
  trackedScheduledJobId: string | null
  registerScheduledServerJob: (jobId: string) => void
  clearTrackedScheduledServerJob: () => void
  serverScheduledJobDetail: null
}

const PendingStationChangesContext = createContext<PendingStationChangesContextValue | null>(null)

function loadPendingChangesFromStorage(): Record<string, PendingChangeEntry> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PENDING_CHANGES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, PendingChangeEntry>
  } catch {
    return {}
  }
}

export const PendingStationChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChangeEntry>>(
    loadPendingChangesFromStorage
  )
  const [trackedScheduledJobId, setTrackedScheduledJobId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_CHANGES_STORAGE_KEY, JSON.stringify(pendingChanges))
    } catch {
      /* quota / private mode */
    }
  }, [pendingChanges])

  const upsertPendingChange = useCallback(
    (
      station: Station,
      updated: Partial<Station>,
      targetCollectionId: StationCollectionId,
      sandboxUpdated?: Partial<SandboxStationDoc> | null,
      sandboxOriginal?: Partial<SandboxStationDoc> | null
    ) => {
      setPendingChanges((prev) => ({
        ...prev,
        [station.id]: {
          targetCollectionId,
          original: station,
          updated,
          sandboxUpdated: sandboxUpdated ?? prev[station.id]?.sandboxUpdated ?? null,
          sandboxOriginal: sandboxOriginal ?? prev[station.id]?.sandboxOriginal ?? null,
          isNew: prev[station.id]?.isNew,
        },
      }))
    },
    []
  )

  const addNewPendingStation = useCallback(
    (
      stationId: string,
      updated: Partial<Station>,
      targetCollectionId: StationCollectionId,
      sandboxUpdated?: Partial<SandboxStationDoc> | null
    ) => {
      const original: Station = {
        id: stationId,
        stationName: updated.stationName ?? '',
        crsCode: updated.crsCode ?? '',
        tiploc: updated.tiploc ?? null,
        latitude: typeof updated.latitude === 'number' ? updated.latitude : 0,
        longitude: typeof updated.longitude === 'number' ? updated.longitude : 0,
        country: updated.country ?? null,
        county: updated.county ?? null,
        toc: updated.toc ?? null,
        stnarea: updated.stnarea ?? null,
        yearlyPassengers: (updated.yearlyPassengers ?? null) as Station['yearlyPassengers'],
      }
      setPendingChanges((prev) => ({
        ...prev,
        [stationId]: { targetCollectionId, original, updated, sandboxUpdated: sandboxUpdated ?? null, isNew: true },
      }))
    },
    []
  )

  const clearPendingChange = useCallback((stationId: string) => {
    setPendingChanges((prev) => {
      const next = { ...prev }
      delete next[stationId]
      return next
    })
  }, [])

  const clearAllPendingChanges = useCallback(() => setPendingChanges({}), [])

  const clearPendingChangesForIds = useCallback((stationIds: string[]) => {
    if (stationIds.length === 0) return
    setPendingChanges((prev) => {
      const next = { ...prev }
      for (const id of stationIds) delete next[id]
      return next
    })
  }, [])

  const registerScheduledServerJob = useCallback((jobId: string) => setTrackedScheduledJobId(jobId), [])
  const clearTrackedScheduledServerJob = useCallback(() => setTrackedScheduledJobId(null), [])

  const value = useMemo<PendingStationChangesContextValue>(
    () => ({
      pendingChanges,
      upsertPendingChange,
      addNewPendingStation,
      clearPendingChange,
      clearAllPendingChanges,
      clearPendingChangesForIds,
      trackedScheduledJobId,
      registerScheduledServerJob,
      clearTrackedScheduledServerJob,
      serverScheduledJobDetail: null,
    }),
    [
      pendingChanges,
      upsertPendingChange,
      addNewPendingStation,
      clearPendingChange,
      clearAllPendingChanges,
      clearPendingChangesForIds,
      trackedScheduledJobId,
      registerScheduledServerJob,
      clearTrackedScheduledServerJob,
    ]
  )

  return <PendingStationChangesContext.Provider value={value}>{children}</PendingStationChangesContext.Provider>
}

export const usePendingStationChanges = (): PendingStationChangesContextValue => {
  const ctx = useContext(PendingStationChangesContext)
  if (!ctx) {
    throw new Error('usePendingStationChanges must be used within PendingStationChangesProvider')
  }
  return ctx
}
