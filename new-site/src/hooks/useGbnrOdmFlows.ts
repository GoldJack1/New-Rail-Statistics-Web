'use client'

import { useEffect, useState } from 'react'
import {
  fetchGbnrOdmFlowsByNlc,
  type GbnrOdmFlowsDoc,
} from '@/services/gbnrOdmFlows'

export type GbnrOdmFlowsState =
  | { status: 'idle' }
  | { status: 'waiting_nlc' }
  | { status: 'loading' }
  | { status: 'ready'; doc: GbnrOdmFlowsDoc }
  | { status: 'not_found'; nlc: string }
  | { status: 'error'; message: string }

/**
 * Load ORR ODM top/bottom destinations for a station matched by NLC.
 */
export function useGbnrOdmFlows(
  nlc: string | null | undefined,
  enabled: boolean
): GbnrOdmFlowsState {
  const [state, setState] = useState<GbnrOdmFlowsState>({ status: 'idle' })

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' })
      return
    }

    const nlcCode = nlc?.trim() ?? ''
    if (!nlcCode) {
      setState({ status: 'waiting_nlc' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    void fetchGbnrOdmFlowsByNlc(nlcCode)
      .then((doc) => {
        if (cancelled) return
        if (!doc) {
          setState({ status: 'not_found', nlc: nlcCode })
          return
        }
        setState({ status: 'ready', doc })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load ODM flows',
        })
      })

    return () => {
      cancelled = true
    }
  }, [nlc, enabled])

  return state
}
