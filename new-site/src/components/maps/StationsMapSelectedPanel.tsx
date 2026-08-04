'use client'

import { forwardRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import StationCard from '../cards/StationCard/StationCard'
import LightRailStopCard from '../cards/LightRailStopCard/LightRailStopCard'
import { isLightRailStop } from '../../utils/stationCardForNetwork'
import { BUTWideButton } from '../buttons'
import { isNetworkCollection } from '../../constants/stationCollections'
import { buildStationPath, getStationNetworkCollectionId } from '../../utils/stationAreaSlug'
import { formatMapPanelLocationDisplay } from '../../utils/formatStationLocation'
import { usePendingStationChanges } from '@/hooks/usePendingStationChanges'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { setStationDetailsNavigationState } from '@/utils/clientNavigationState'
import { snapshotActiveStationsMapView } from '@/utils/mapsMapViewStorage'
import type { Station } from '../../types'
import './StationsMapSelectedPanel.css'

interface StationsMapSelectedPanelProps {
  station: Station | null
  isPendingNew?: boolean
  detailsLoading?: boolean
  /** When true (admin edit mode), open the station edit page instead of view. */
  isEditMode?: boolean
}

const StationsMapSelectedPanel = forwardRef<HTMLElement, StationsMapSelectedPanelProps>(
  ({ station, isPendingNew = false, detailsLoading = false, isEditMode = false }, ref) => {
    const router = useRouter()
    const pathname = usePathname()
    const { networkView } = useStationCollection()
    const { pendingChanges } = usePendingStationChanges()

    const collectionId = station ? getStationNetworkCollectionId(station) : null
    const locationDisplay = station ? formatMapPanelLocationDisplay(station) : ''
    const isLightRail = station ? isLightRailStop(station) : false

    const stationPath = station ? buildStationPath(station, collectionId ?? undefined) : null
    const mapReturnTo = pathname === '/admin/map' || pathname === '/stations/map' ? pathname : '/stations/map'

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
        snapshotActiveStationsMapView(networkView)
        setStationDetailsNavigationState({ returnTo: mapReturnTo })
        router.push(
          isEditMode
            ? `/admin/stations/${stationPath}/edit`
            : `/stations/${stationPath}`
        )
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
          </>
        )}
      </aside>
    )
  }
)

StationsMapSelectedPanel.displayName = 'StationsMapSelectedPanel'

export default StationsMapSelectedPanel
