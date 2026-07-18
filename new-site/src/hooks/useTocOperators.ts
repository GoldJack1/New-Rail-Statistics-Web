'use client'

import { useEffect, useState } from 'react'
import {
  fetchTocOperators,
  getCachedTocOperators,
  type TocOperator,
} from '@/services/tocOperators'

export type TocOperatorsState =
  | { status: 'idle' | 'loading'; operators: TocOperator[] }
  | { status: 'ready'; operators: TocOperator[] }
  | { status: 'error'; operators: TocOperator[]; message: string }

/**
 * Load `toc_operators` once per session for TOC chip colours / display names.
 */
export function useTocOperators(enabled = true): TocOperatorsState {
  const [state, setState] = useState<TocOperatorsState>(() => {
    const cached = getCachedTocOperators()
    if (cached) return { status: 'ready', operators: cached }
    return { status: enabled ? 'loading' : 'idle', operators: [] }
  })

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', operators: getCachedTocOperators() ?? [] })
      return
    }

    const cached = getCachedTocOperators()
    if (cached) {
      setState({ status: 'ready', operators: cached })
      return
    }

    let cancelled = false
    setState({ status: 'loading', operators: [] })
    fetchTocOperators()
      .then((operators) => {
        if (cancelled) return
        setState({ status: 'ready', operators })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          operators: [],
          message: error instanceof Error ? error.message : 'Failed to load TOC operators.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
