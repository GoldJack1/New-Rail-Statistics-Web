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

/** Session cache so navigating between stations does not re-flicker optional fields. */
const fieldSchemaCache = new Map<StationCollectionId, StationCollectionFieldSchema>()

function catalogSchemaFor(collectionId: StationCollectionId): StationCollectionFieldSchema {
  return inferStationCollectionFieldSchema([], collectionId)
}

export function useStationCollectionFieldSchema(collectionId: StationCollectionId | null): {
  fieldSchema: StationCollectionFieldSchema
  loading: boolean
} {
  const [fieldSchema, setFieldSchema] = useState<StationCollectionFieldSchema>(() => {
    if (!collectionId) return EMPTY_STATION_COLLECTION_FIELD_SCHEMA
    return fieldSchemaCache.get(collectionId) ?? catalogSchemaFor(collectionId)
  })
  const [loading, setLoading] = useState(() => {
    if (!collectionId) return false
    return !fieldSchemaCache.has(collectionId)
  })

  useEffect(() => {
    if (!collectionId) {
      setFieldSchema(EMPTY_STATION_COLLECTION_FIELD_SCHEMA)
      setLoading(false)
      return
    }

    const cached = fieldSchemaCache.get(collectionId)
    if (cached) {
      setFieldSchema(cached)
      setLoading(false)
      return
    }

    // Paint catalog immediately (correct defaultStnarea / network floors) while the sample loads.
    setFieldSchema(catalogSchemaFor(collectionId))
    setLoading(true)

    let cancelled = false
    void import('../services/firebase')
      .then(({ fetchStationCollectionSampleDocs }) => fetchStationCollectionSampleDocs(collectionId))
      .then((docs) => {
        if (cancelled) return
        const next = inferStationCollectionFieldSchema(docs, collectionId)
        fieldSchemaCache.set(collectionId, next)
        setFieldSchema(next)
      })
      .catch(() => {
        if (cancelled) return
        const fallback = catalogSchemaFor(collectionId)
        fieldSchemaCache.set(collectionId, fallback)
        setFieldSchema(fallback)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
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
