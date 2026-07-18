'use client'

import { useRouter, useParams } from 'next/navigation'
import React, { useEffect } from 'react'

import { useStations } from '@/hooks/useStations'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import {
  buildStationPath,
  findStationByShortNetworkPath,
  getCollectionIdFromNetworkUrlSlug,
} from '@/utils/stationAreaSlug'
import { paramAsString } from '@/utils/nextParams'
import PageTopHeader from '@/components/misc/PageTopHeader/PageTopHeader'

/**
 * Handles short-id URLs (`/stations/gbnr-1566`) by redirecting to
 * `/stations/:network/:stationSlug`. Known network slugs without a station segment
 * show not found (there is no network-only listing at this path).
 * Long-category and bare id-only URLs are no longer supported.
 */
export default function StationNetworkOrLegacyPage() {
  const router = useRouter()
  const network = paramAsString(useParams().network)
  const { stations, loading, error } = useStations()
  const { collectionId } = useStationCollection()

  const isKnownNetworkSlug = Boolean(getCollectionIdFromNetworkUrlSlug(network))
  const station = isKnownNetworkSlug
    ? null
    : findStationByShortNetworkPath(stations, network, collectionId)

  useEffect(() => {
    if (isKnownNetworkSlug || loading || error || !station) return
    const path = buildStationPath(station, collectionId)
    router.replace(`/stations/${path}`)
  }, [collectionId, error, isKnownNetworkSlug, loading, router, station])

  if (loading) {
    return (
      <div className="container container--station-details">
        <PageTopHeader title="Loading station" />
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

  if (isKnownNetworkSlug || !station) {
    return (
      <div className="container">
        <div className="error-state">
          <h3>Station not found</h3>
          <p>
            {isKnownNetworkSlug
              ? 'Select a station from the map or stations list.'
              : 'We couldn’t find that station. Use /stations/{network}/{slug} or /stations/{shortCode}-{id} (e.g. /stations/gbnr-1566).'}
          </p>
        </div>
      </div>
    )
  }

  return null
}
