'use client'

import { PendingStationChangesProvider } from '@/contexts/PendingStationChangesContext'

export default function StationsMapPendingBoundary({ children }: { children: React.ReactNode }) {
  return <PendingStationChangesProvider>{children}</PendingStationChangesProvider>
}
