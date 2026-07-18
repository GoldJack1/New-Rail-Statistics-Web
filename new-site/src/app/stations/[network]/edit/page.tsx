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

/** Redirects `/stations/gbnr-1566/edit` to `/admin/stations/:network/:stationSlug/edit`. */
export default function LegacyStationEditRedirectPage() {
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
    router.replace(`/admin/stations/${path}/edit`)
  }, [collectionId, error, isKnownNetworkSlug, loading, router, station])

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

  if (isKnownNetworkSlug || !station) {
    return (
      <div className="container">
        <div className="error-state">
          <h3>Station not found</h3>
          <p>
            {isKnownNetworkSlug
              ? 'Use the admin stations list to edit a station.'
              : 'We couldn’t find that station. Use a short-code URL like /stations/gbnr-1566/edit.'}
          </p>
        </div>
      </div>
    )
  }

  return null
}
