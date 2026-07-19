'use client'

import { useEffect, useState } from 'react'
import {
  fetchGbnrPassUsageByCrsAndNlc,
  type GbnrPassUsageDoc,
} from '@/services/gbnrPassUsageData'

export type GbnrPassUsageState =
  | { status: 'idle' }
  | { status: 'waiting_codes' }
  | { status: 'loading' }
  | { status: 'ready'; doc: GbnrPassUsageDoc }
  | { status: 'not_found'; crs: string; nlc: string }
  | { status: 'error'; message: string }

/**
 * Load ORR Table 1415 usage for a station matched by CRS + NLC.
 * Stays in waiting_codes until both identifiers are available.
 */
export function useGbnrPassUsageData(
  crsCode: string | null | undefined,
  nlc: string | null | undefined,
  enabled: boolean
): GbnrPassUsageState {
  const [state, setState] = useState<GbnrPassUsageState>({ status: 'idle' })

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' })
      return
    }

    const crs = crsCode?.trim().toUpperCase() ?? ''
    const nlcCode = nlc?.trim() ?? ''
    if (!crs || !nlcCode) {
      setState({ status: 'waiting_codes' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    void fetchGbnrPassUsageByCrsAndNlc(crs, nlcCode)
      .then((doc) => {
        if (cancelled) return
        if (!doc) {
          setState({ status: 'not_found', crs, nlc: nlcCode })
          return
        }
        setState({ status: 'ready', doc })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load ORR usage data',
        })
      })

    return () => {
      cancelled = true
    }
  }, [crsCode, nlc, enabled])

  return state
}
