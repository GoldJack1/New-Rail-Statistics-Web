'use client'

import React from 'react'
import type { Station } from '../../../types'
import { NETWORK_LABELS } from '../../../constants/stationCollections'
import { LIGHTRAIL_COLLECTION_ID } from '../../../utils/lightRailStationFields'
import { LightRailLineStrip } from '../../chips/LightRailLineStrip'
import StationCardActionBar from '../StationCardActionBar/StationCardActionBar'
import '../StationCard/StationCard.css'
import './LightRailStopCard.css'

interface LightRailStopCardProps {
  station: Station
  locationDisplay: string
  onCardClick: () => void
  onInfoClick: () => void
}

const LightRailStopCard: React.FC<LightRailStopCardProps> = ({
  station,
  locationDisplay,
  onCardClick,
  onInfoClick,
}) => {
  const operatorLabel = station.toc || NETWORK_LABELS[LIGHTRAIL_COLLECTION_ID]

  return (
    <article className="rs-station-card-stack rs-station-card-stack--light-rail">
      <section className="rs-station-text-card rs-station-text-card--light-rail" onClick={onCardClick}>
        <h2 className="rs-station-name">{station.stationName || 'Unknown Stop'}</h2>
        <p className="rs-station-location">{locationDisplay}</p>
        <p
          className="rs-station-operator rs-station-operator--light-rail-hidden"
          aria-hidden="true"
        >
          {operatorLabel}
        </p>
        <LightRailLineStrip linesServed={station.linesServed} />
      </section>
      <StationCardActionBar onInfoClick={onInfoClick} />
    </article>
  )
}

export default LightRailStopCard
