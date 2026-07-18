'use client'

import { useEffect, useState } from 'react'
import type { StationCollectionId } from '../constants/stationCollections'
import { isStationCollectionId } from '../constants/stationCollections'
import type { Station } from '../types'
import {
  EMPTY_STATION_COLLECTION_FIELD_SCHEMA,
  inferStationCollectionFieldSchema,
  type StationCollectionFieldSchema,
} from '../utils/stationCollectionFieldSchema'
import { useStationCollection } from '../contexts/StationCollectionContext'
import { getStationNetworkCollectionId } from '../utils/stationAreaSlug'

export function useStationCollectionFieldSchema(collectionId: StationCollectionId | null): {
  fieldSchema: StationCollectionFieldSchema
  loading: boolean
} {
  const [fieldSchema, setFieldSchema] = useState<StationCollectionFieldSchema>(EMPTY_STATION_COLLECTION_FIELD_SCHEMA)
  const [loading, setLoading] = useState(Boolean(collectionId))

  useEffect(() => {
    if (!collectionId) {
      setFieldSchema(EMPTY_STATION_COLLECTION_FIELD_SCHEMA)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const runFetch = () => {
      void import('../services/firebase')
        .then(({ fetchStationCollectionSampleDocs }) => fetchStationCollectionSampleDocs(collectionId))
        .then((docs) => {
          if (!cancelled) {
            setFieldSchema(inferStationCollectionFieldSchema(docs, collectionId))
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFieldSchema(inferStationCollectionFieldSchema([], collectionId))
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    let idleId: number | null = null
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null

    const scheduleDeferredFetch = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(runFetch, { timeout: 1500 })
        return
      }
      timeoutId = globalThis.setTimeout(runFetch, 0)
    }

    scheduleDeferredFetch()

    return () => {
      cancelled = true
      if (idleId != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId != null) {
        globalThis.clearTimeout(timeoutId)
      }
    }
  }, [collectionId])

  return { fieldSchema, loading }
}

/** Resolve field schema for a station, optionally reusing a schema fetched by the parent. */
export function useStationFieldSchema(
  station: Station,
  fieldSchemaOverride?: StationCollectionFieldSchema
): { fieldSchema: StationCollectionFieldSchema; loading: boolean } {
  const { collectionId } = useStationCollection()
  const stationCollectionId = getStationNetworkCollectionId(station, collectionId) ?? collectionId
  const schemaCollectionId = isStationCollectionId(stationCollectionId) ? stationCollectionId : null
  const { fieldSchema, loading } = useStationCollectionFieldSchema(fieldSchemaOverride ? null : schemaCollectionId)

  return {
    fieldSchema: fieldSchemaOverride ?? fieldSchema,
    loading: fieldSchemaOverride ? false : loading,
  }
}
