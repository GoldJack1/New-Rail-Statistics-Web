'use client'

import React, { useEffect } from 'react'
import { BUTTabButton } from '../../buttons'
import {
  DEFAULT_NETWORK_VIEW,
  getVisibleNetworkViewTabs,
  isAdminOnlyNetworkView,
  isNetworkCollection,
  type NetworkViewFilter,
} from '../../../constants/stationCollections'
import { NETWORK_MAP_COLORS } from '../../../constants/stationNetworkMapColors'
import { useStationAdminMode } from '../../../hooks/useStationAdminMode'
import './NetworkStationTabGroup.css'

interface NetworkStationTabGroupProps {
  value: NetworkViewFilter
  onChange: (value: NetworkViewFilter) => void
  className?: string
}

const NetworkStationTabGroup: React.FC<NetworkStationTabGroupProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const isAdminMode = useStationAdminMode()
  const visibleTabs = getVisibleNetworkViewTabs(isAdminMode)

  useEffect(() => {
    if (isAdminMode) return
    if (!isAdminOnlyNetworkView(value)) return
    onChange(DEFAULT_NETWORK_VIEW)
  }, [isAdminMode, onChange, value])

  return (
    <div
      className={`network-station-tab-group ${className}`.trim()}
      role="tablist"
      aria-label="Station network"
    >
      {visibleTabs.map((tab) => {
        const isSelected = value === tab.value
        const dotColor = isNetworkCollection(tab.value) ? NETWORK_MAP_COLORS[tab.value] : null
        return (
          <BUTTabButton
            key={tab.value}
            type="button"
            width="hug"
            role="tab"
            pressed={isSelected}
            ariaSelected={isSelected}
            onClick={() => onChange(tab.value)}
          >
            <span className="network-station-tab-group__label">
              {dotColor && (
                <span
                  className="network-station-tab-group__dot"
                  style={{ backgroundColor: dotColor }}
                  aria-hidden="true"
                />
              )}
              {tab.label}
            </span>
          </BUTTabButton>
        )
      })}
    </div>
  )
}

export default NetworkStationTabGroup
