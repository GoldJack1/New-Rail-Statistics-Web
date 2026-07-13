'use client'

import type { ReactNode } from 'react'
import { StationsCacheProvider } from '@/contexts/StationsCacheContext'

export default function StationsDataBoundary({ children }: { children: ReactNode }) {
  return <StationsCacheProvider>{children}</StationsCacheProvider>
}
