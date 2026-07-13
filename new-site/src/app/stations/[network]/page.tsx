'use client'

import { useRouter, useParams } from 'next/navigation'
import React, { useEffect } from 'react'

import { useStations } from '@/hooks/useStations'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import {
  buildStationPath,
  getCollectionIdFromNetworkUrlSlug,
  parseLegacyStationPath,
} from '@/utils/stationAreaSlug'
import { paramAsString } from '@/utils/nextParams'

/**
 * Handles legacy single-segment URLs (`/stations/:legacyId`) by redirecting to
 * `/stations/:network/:stationSlug`. Known network slugs without a station segment
 * show not found (there is no network-only listing at this path).
 */
export default function StationNetworkOrLegacyPage() {
  const router = useRouter()
  const network = paramAsString(useParams().network)
  const { stations, loading, error } = useStations()
  const { collectionId } = useStationCollection()

  const isKnownNetworkSlug = Boolean(getCollectionIdFromNetworkUrlSlug(network))

  useEffect(() => {
    if (isKnownNetworkSlug || loading || error) return
    const stationId = parseLegacyStationPath(network)
    const station = stations.find((s) => s.id === stationId) ?? null
    if (!station) return
    const path = buildStationPath(station, collectionId)
    router.replace(`/stations/${path}`)
  }, [collectionId, error, isKnownNetworkSlug, loading, network, router, stations])

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading station…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-state">
          <h3>Failed to Load Station</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (isKnownNetworkSlug) {
    return (
      <div className="container">
        <div className="error-state">
          <h3>Station not found</h3>
          <p>Select a station from the map or stations list.</p>
        </div>
      </div>
    )
  }

  const stationId = parseLegacyStationPath(network)
  const station = stations.find((s) => s.id === stationId) ?? null
  if (!station) {
    return (
      <div className="container">
        <div className="error-state">
          <h3>Station not found</h3>
          <p>We couldn’t find that station in the current data source.</p>
        </div>
      </div>
    )
  }

  return null
}
