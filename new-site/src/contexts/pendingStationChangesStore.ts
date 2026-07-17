'use client'

import { createContext } from 'react'
import type { PendingStationChangesContextValue } from '@/contexts/pendingStationChangesTypes'

export const PendingStationChangesContext = createContext<PendingStationChangesContextValue | null>(
  null
)
