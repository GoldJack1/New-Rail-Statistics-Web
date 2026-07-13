'use client'

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react'
import type { PendingStationChangesContextValue } from '@/contexts/pendingStationChangesTypes'

export type { PendingChangeEntry, ServerScheduledJobDetail } from '@/contexts/pendingStationChangesTypes'

const PendingStationChangesContext = createContext<PendingStationChangesContextValue | null>(null)

const NOOP_PENDING_CHANGES: PendingStationChangesContextValue = {
  pendingChanges: {},
  upsertPendingChange: () => {},
  addNewPendingStation: () => {},
  clearPendingChange: () => {},
  clearAllPendingChanges: () => {},
  clearPendingChangesForIds: () => {},
  trackedScheduledJobId: null,
  registerScheduledServerJob: () => {},
  clearTrackedScheduledServerJob: () => {},
  serverScheduledJobDetail: null,
}

/** Read-only public browse: no localStorage sync or Firestore scheduled-job listener. */
export function PendingStationChangesNoopProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PendingStationChangesContext.Provider value={NOOP_PENDING_CHANGES}>
      {children}
    </PendingStationChangesContext.Provider>
  )
}

export const usePendingStationChanges = (): PendingStationChangesContextValue => {
  const ctx = useContext(PendingStationChangesContext)
  if (!ctx) {
    throw new Error('usePendingStationChanges must be used within PendingStationChangesProvider')
  }
  return ctx
}

export { PendingStationChangesContext }
