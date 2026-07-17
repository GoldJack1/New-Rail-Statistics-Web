'use client'

import { PendingStationChangesProvider } from '@/contexts/PendingStationChangesContext'

/** Detail / edit redirect routes under `/stations/:network/*` need pending-change state. */
export default function StationsNetworkLayout({ children }: { children: React.ReactNode }) {
  return <PendingStationChangesProvider>{children}</PendingStationChangesProvider>
}
