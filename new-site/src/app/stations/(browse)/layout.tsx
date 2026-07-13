'use client'

import type { ReactNode } from 'react'
import StationsDataBoundary from '@/contexts/StationsDataBoundary'
import { PendingStationChangesNoopProvider } from '@/contexts/PendingStationChangesContext.shared'

/** Public `/stations` browse list — no Firestore pending-change sync. */
export default function StationsBrowseLayout({ children }: { children: ReactNode }) {
  return (
    <StationsDataBoundary>
      <PendingStationChangesNoopProvider>{children}</PendingStationChangesNoopProvider>
    </StationsDataBoundary>
  )
}
