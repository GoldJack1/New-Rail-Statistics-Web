'use client'

import React from 'react'
import { BUTWideButton } from '@/components/buttons'
import { getVisibleNetworkViewTabs } from '@/constants/stationCollections'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import { useStationAdminMode } from '@/hooks/useStationAdminMode'
import './MapLiteModeGate.css'

interface MapLiteModeGateProps {
  onSelectNetwork: (network: NetworkViewFilter) => void
  onUseFullMap: () => void
}

const MapLiteModeGate: React.FC<MapLiteModeGateProps> = ({ onSelectNetwork, onUseFullMap }) => {
  const isAdminMode = useStationAdminMode()
  const networkOptions = getVisibleNetworkViewTabs(isAdminMode).filter((tab) => tab.value !== 'all')

  return (
    <div className="map-lite-mode-gate" role="region" aria-label="Map performance mode">
      <div className="map-lite-mode-gate__card">
        <h2 className="map-lite-mode-gate__title">Choose a network for the map</h2>
        <p className="map-lite-mode-gate__body">
          This phone works best showing one network at a time. Pick a network below, or load the full
          map if you want to try anyway.
        </p>
        <div className="map-lite-mode-gate__actions">
          {networkOptions.map((tab) => (
            <BUTWideButton key={tab.value} onClick={() => onSelectNetwork(tab.value)} width="fill">
              {tab.label}
            </BUTWideButton>
          ))}
        </div>
        <button type="button" className="map-lite-mode-gate__full-link" onClick={onUseFullMap}>
          Load full map anyway
        </button>
      </div>
    </div>
  )
}

export default MapLiteModeGate
