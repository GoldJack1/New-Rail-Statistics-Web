'use client'

import ProtectedRoute from '@/components/firebase/ProtectedRoute/ProtectedRoute'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
