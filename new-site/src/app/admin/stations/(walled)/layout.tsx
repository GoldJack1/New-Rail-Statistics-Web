'use client'

import ProtectedRoute from '@/components/firebase/ProtectedRoute/ProtectedRoute'

/**
 * Temporary login gate for the stations list at `/admin/stations`.
 * Remove this layout (or stop wrapping with ProtectedRoute) when the list goes public;
 * admin mode will stay gated via `useStationAdminMode`, and write routes remain under
 * `admin/(authenticated)/stations/`.
 */
export default function WalledStationsBrowseLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
