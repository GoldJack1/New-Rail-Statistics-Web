'use client'

import ProtectedRoute from '@/components/firebase/ProtectedRoute/ProtectedRoute'

/** Admin tools, station writes, and other authenticated-only routes. */
export default function AuthenticatedAdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
