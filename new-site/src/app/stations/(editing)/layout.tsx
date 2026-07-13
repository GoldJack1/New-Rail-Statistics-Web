'use client'

import type { ReactNode } from 'react'
import StationEditingBoundary from '@/contexts/StationEditingBoundary'

/** Station detail, map, and network routes need pending-change context. */
export default function StationsEditingLayout({ children }: { children: ReactNode }) {
  return <StationEditingBoundary>{children}</StationEditingBoundary>
}
