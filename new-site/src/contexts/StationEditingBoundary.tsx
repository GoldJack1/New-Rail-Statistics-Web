'use client'

import type { ReactNode } from 'react'
import { PendingStationChangesProvider } from '@/contexts/PendingStationChangesProvider'
import StationsDataBoundary from '@/contexts/StationsDataBoundary'

export default function StationEditingBoundary({ children }: { children: ReactNode }) {
  return (
    <StationsDataBoundary>
      <PendingStationChangesProvider>{children}</PendingStationChangesProvider>
    </StationsDataBoundary>
  )
}
