'use client'

import { forwardRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import StationCard from '../cards/StationCard/StationCard'
import LightRailStopCard from '../cards/LightRailStopCard/LightRailStopCard'
import { isLightRailStop } from '../../utils/stationCardForNetwork'
import { BUTWideButton } from '../buttons'
import { NETWORK_LABELS, isNetworkCollection } from '../../constants/stationCollections'
import { buildStationPath, getStationNetworkCollectionId } from '../../utils/stationAreaSlug'
import { formatMapPanelLocationDisplay } from '../../utils/formatStationLocation'
import { parseLightRailLinesServed } from '../../utils/lightRailStationFields'
import { usePendingStationChanges } from '../../contexts/PendingStationChangesContext'
import type { Station } from '../../types'
import './StationsMapSelectedPanel.css'

interface StationsMapSelectedPanelProps {
  station: Station | null
  isPendingNew?: boolean
  detailsLoading?: boolean
}

function formatDetail(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '---'
}

function getLatestPassengerEntry(
  passengers: Station['yearlyPassengers']
): { year: string; value: string } | null {
  if (!passengers || typeof passengers !== 'object') return null

  const yearsWithData = Object.keys(passengers)
    .filter((key) => /^\d{4}$/.test(key))
    .filter((key) => typeof passengers[key] === 'number')
    .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))

  if (yearsWithData.length === 0) return null

  const year = yearsWithData[0]
  const count = passengers[year] as number
  return { year, value: count.toLocaleString() }
}

const StationsMapSelectedPanel = forwardRef<HTMLElement, StationsMapSelectedPanelProps>(
  ({ station, isPendingNew = false, detailsLoading = false }, ref) => {
    const router = useRouter()
    const { pendingChanges } = usePendingStationChanges()

    const collectionId = station ? getStationNetworkCollectionId(station) : null
    const networkLabel =
      collectionId != null && isNetworkCollection(collectionId)
        ? NETWORK_LABELS[collectionId]
        : null
    const passengerEntry = useMemo(
      () => (station ? getLatestPassengerEntry(station.yearlyPassengers) : null),
      [station]
    )
    const locationDisplay = station ? formatMapPanelLocationDisplay(station) : ''
    const lightRailLines = useMemo(
      () => (station ? parseLightRailLinesServed(station.linesServed ?? '') : []),
      [station]
    )
    const isLightRail = station ? isLightRailStop(station) : false

    const stationPath = station ? buildStationPath(station, collectionId ?? undefined) : null
    const openStation = () => {
      if (isPendingNew && station) {
        if (collectionId && isNetworkCollection(collectionId) && pendingChanges[station.id]?.isNew) {
          router.push('/admin/stations/new')
        } else {
          router.push('/admin/stations/pending-review')
        }
        return
      }
      if (stationPath) {
        router.push(`/stations/${stationPath}`)
      }
    }

    const editPendingDraft = () => {
      if (!station || !isPendingNew || !collectionId || !isNetworkCollection(collectionId)) return
      const entry = pendingChanges[station.id]
      if (!entry?.isNew) return
      router.push('/admin/stations/new')
    }

    return (
      <aside ref={ref} className="stations-map-selected-panel" aria-label="Selected station">
        {!station ? (
          <p className="stations-map-selected-panel__empty">
            Click a station pin on the map to view its details here.
          </p>
        ) : (
          <>
            {detailsLoading && (
              <p className="stations-map-selected-panel__loading" role="status">
                Loading station details…
              </p>
            )}
            {isLightRail ? (
              <LightRailStopCard
                station={station}
                locationDisplay={locationDisplay}
                onCardClick={openStation}
                onInfoClick={openStation}
              />
            ) : (
              <StationCard
                station={station}
                locationDisplay={locationDisplay}
                onCardClick={openStation}
                onInfoClick={openStation}
              />
            )}
            {isPendingNew && (
              <>
                <p className="stations-map-selected-panel__pending">Unsaved — pending publish</p>
                <BUTWideButton type="button" width="fill" onClick={editPendingDraft}>
                  Edit draft station
                </BUTWideButton>
              </>
            )}
            <dl className="stations-map-selected-panel__details">
              {networkLabel && (
                <div className="stations-map-selected-panel__row">
                  <dt>Network</dt>
                  <dd>{networkLabel}</dd>
                </div>
              )}
              {isLightRail ? (
                <>
                  {lightRailLines.length > 0 && (
                    <div className="stations-map-selected-panel__row">
                      <dt>Lines</dt>
                      <dd>{lightRailLines.join(', ')}</dd>
                    </div>
                  )}
                  {station.dateOpened?.trim() && (
                    <div className="stations-map-selected-panel__row">
                      <dt>Opened</dt>
                      <dd>{formatDetail(station.dateOpened)}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="stations-map-selected-panel__row">
                    <dt>CRS code</dt>
                    <dd>{formatDetail(station.crsCode)}</dd>
                  </div>
                  <div className="stations-map-selected-panel__row">
                    <dt>TIPLOC</dt>
                    <dd>{formatDetail(station.tiploc)}</dd>
                  </div>
                  {passengerEntry && (
                    <div className="stations-map-selected-panel__row">
                      <dt>Passengers ({passengerEntry.year})</dt>
                      <dd>{passengerEntry.value}</dd>
                    </div>
                  )}
                </>
              )}
              <div className="stations-map-selected-panel__row">
                <dt>Coordinates</dt>
                <dd>
                  {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </aside>
    )
  }
)

StationsMapSelectedPanel.displayName = 'StationsMapSelectedPanel'

export default StationsMapSelectedPanel
