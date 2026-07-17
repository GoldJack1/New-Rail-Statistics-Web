'use client'

import ProtectedRoute from '@/components/firebase/ProtectedRoute/ProtectedRoute'

/**
 * Login gate for the admin stations list at `/admin/stations`.
 * The public list lives at `/stations`; write routes remain under
 * `admin/(authenticated)/stations/`.
 */
export default function WalledStationsAdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute showShellWhileChecking>{children}</ProtectedRoute>
}
