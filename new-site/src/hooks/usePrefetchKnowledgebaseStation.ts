'use client'

import { useEffect } from 'react'
import {
  isValidKnowledgebaseCrs,
  loadKnowledgebaseStation,
  normalizeKnowledgebaseCrs,
} from '@/utils/knowledgebaseStationFetch'

/**
 * Start fetching NRE Knowledgebase Stations XML on page load (no UI).
 * Results are cached for StationKnowledgebasePanel when the Knowledgebase tab opens.
 */
export function usePrefetchKnowledgebaseStation(
  crsCode: string | null | undefined,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled) return
    const crs = normalizeKnowledgebaseCrs(crsCode)
    if (!isValidKnowledgebaseCrs(crs)) return
    void loadKnowledgebaseStation(crs)
  }, [crsCode, enabled])
}
