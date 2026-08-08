'use client'

import { useEffect, useMemo, useState } from 'react'
import type { NetworkCollectionId, NetworkViewFilter } from '@/constants/stationCollections'
import {
  filterNetworkMessagesForView,
  listNetworkMessages
} from '@/services/networkMessages'
import type { NetworkMessage } from '@/types/networkMessages'

type UseNetworkMessagesState = {
  messages: NetworkMessage[]
  loading: boolean
  error: string | null
}

/**
 * Active network-wide alert messages for a browse tab or a single network collection.
 * Returns [] while loading / on error so banners simply stay hidden.
 */
export function useNetworkMessages(
  networkView: NetworkViewFilter | NetworkCollectionId | null | undefined
): UseNetworkMessagesState {
  const [all, setAll] = useState<NetworkMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void listNetworkMessages()
      .then((messages) => {
        if (cancelled) return
        setAll(messages)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setAll([])
        setError(err instanceof Error ? err.message : 'Failed to load network messages')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const messages = useMemo(() => {
    if (!networkView) return []
    return filterNetworkMessagesForView(all, networkView)
  }, [all, networkView])

  return { messages, loading, error }
}
