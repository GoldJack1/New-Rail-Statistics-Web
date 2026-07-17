'use client'

import { useContext } from 'react'
import { PendingStationChangesContext } from '@/contexts/pendingStationChangesStore'
import {
  EMPTY_PENDING_CHANGES,
  type PendingStationChangesContextValue,
} from '@/contexts/pendingStationChangesTypes'

/**
 * Public `/stations` list has no provider — return a no-op stub so Firestore stays out of the bundle.
 */
export function usePendingStationChanges(): PendingStationChangesContextValue {
  return useContext(PendingStationChangesContext) ?? EMPTY_PENDING_CHANGES
}

export type { PendingChangeEntry, PendingStationChangesContextValue, ServerScheduledJobDetail } from '@/contexts/pendingStationChangesTypes'
