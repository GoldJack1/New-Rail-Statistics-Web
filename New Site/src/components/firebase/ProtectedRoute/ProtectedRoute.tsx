'use client'

import React from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Phase 1 placeholder — per MIGRATION_PLAN.md §5.3 "Option A", `/admin/*`
 * routes (Design System, Stations admin, etc.) are left open/ungated in
 * Phase 1 since there is no real Firebase Auth wired up yet. This is a
 * pure pass-through; Phase 2 will restore the real gate (signed-in +
 * verified email + TOTP enrolled, redirecting to `/log-in` otherwise) by
 * porting the old site's `src/components/firebase/ProtectedRoute/ProtectedRoute.tsx`.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  return <>{children}</>
}

export default ProtectedRoute
