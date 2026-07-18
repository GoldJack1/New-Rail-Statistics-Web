'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getKnowledgebaseStationCache,
  isValidKnowledgebaseCrs,
  loadKnowledgebaseStation,
  normalizeKnowledgebaseCrs,
  type KnowledgebaseFetchResult,
} from '@/utils/knowledgebaseStationFetch'
import {
  extractKnowledgebaseStationSections,
  formatKnowledgebaseLastUpdatedLabel,
  formatKnowledgebasePostalAddress,
  formatKnowledgebaseStationAlert,
  readKnowledgebaseNlc,
  readKnowledgebaseStationOperator,
  type KnowledgebaseStationSection,
} from '@/utils/knowledgebaseStationSections'

export type KnowledgebaseStationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      crs: string
      fetchedAt: string
      sections: KnowledgebaseStationSection[]
      stationOperator: string | null
      postalAddress: string | null
      nlc: string | null
      stationAlert: string | null
      lastUpdatedLabel: string | null
    }

/**
 * Prefetch + expose Knowledgebase station sections for GBNR sidebar tabs.
 */
export function useKnowledgebaseStation(
  crsCode: string | null | undefined,
  enabled: boolean
): KnowledgebaseStationState {
  const crs = normalizeKnowledgebaseCrs(crsCode)
  const [result, setResult] = useState<KnowledgebaseFetchResult | { status: 'idle' | 'loading' }>(
    () => {
      if (!enabled || !isValidKnowledgebaseCrs(crs)) return { status: 'idle' }
      return getKnowledgebaseStationCache(crs) ?? { status: 'loading' }
    }
  )

  useEffect(() => {
    if (!enabled) {
      setResult({ status: 'idle' })
      return
    }
    if (!isValidKnowledgebaseCrs(crs)) {
      setResult({ status: 'error', message: 'This station has no valid CRS code for Knowledgebase.' })
      return
    }

    const cached = getKnowledgebaseStationCache(crs)
    if (cached) {
      setResult(cached)
      return
    }

    let cancelled = false
    setResult({ status: 'loading' })
    void loadKnowledgebaseStation(crs).then((next) => {
      if (!cancelled) setResult(next)
    })
    return () => {
      cancelled = true
    }
  }, [crs, enabled])

  return useMemo((): KnowledgebaseStationState => {
    if (result.status === 'idle' || result.status === 'loading') return { status: result.status }
    if (result.status === 'error') return result
    return {
      status: 'ready',
      crs: result.crs,
      fetchedAt: result.fetchedAt,
      sections: extractKnowledgebaseStationSections(result.data),
      stationOperator: readKnowledgebaseStationOperator(result.data),
      postalAddress: formatKnowledgebasePostalAddress(result.data),
      nlc: readKnowledgebaseNlc(result.data),
      stationAlert: formatKnowledgebaseStationAlert(result.data),
      lastUpdatedLabel: formatKnowledgebaseLastUpdatedLabel(result.data),
    }
  }, [result])
}
