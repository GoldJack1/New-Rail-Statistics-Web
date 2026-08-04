'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SidebarSimple } from '@phosphor-icons/react'
import { BUTCircleButton, BUTTabButton } from '../../buttons'
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
  /** Desktop-only control to show/hide the stations left panel. */
  sidebarVisible?: boolean
  onSidebarVisibleChange?: (visible: boolean) => void
}

const NetworkStationTabGroup: React.FC<NetworkStationTabGroupProps> = ({
  value,
  onChange,
  className = '',
  sidebarVisible,
  onSidebarVisibleChange,
}) => {
  const isAdminMode = useStationAdminMode()
  const visibleTabs = getVisibleNetworkViewTabs(isAdminMode)
  const showSidebarToggle =
    typeof sidebarVisible === 'boolean' && typeof onSidebarVisibleChange === 'function'
  const tabListRef = useRef<HTMLDivElement>(null)
  const [toggleSizePx, setToggleSizePx] = useState<number | null>(null)

  useEffect(() => {
    if (isAdminMode) return
    if (!isAdminOnlyNetworkView(value)) return
    onChange(DEFAULT_NETWORK_VIEW)
  }, [isAdminMode, onChange, value])

  useEffect(() => {
    if (!showSidebarToggle) {
      setToggleSizePx(null)
      return
    }
    const tabList = tabListRef.current
    if (!tabList) return

    const firstTab = tabList.querySelector<HTMLElement>('.rs-button--tab')
    if (!firstTab) return

    const syncSize = () => {
      const height = Math.round(firstTab.getBoundingClientRect().height)
      if (height > 0) setToggleSizePx(height)
    }

    syncSize()
    const observer = new ResizeObserver(syncSize)
    observer.observe(firstTab)
    return () => observer.disconnect()
  }, [showSidebarToggle, visibleTabs.length])

  const tabs = (
    <div
      ref={tabListRef}
      className={['network-station-tab-group', !showSidebarToggle ? className : '']
        .filter(Boolean)
        .join(' ')}
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
            instantAction
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

  if (!showSidebarToggle) return tabs

  return (
    <div className={`network-station-tab-group-row ${className}`.trim()}>
      <BUTCircleButton
        type="button"
        className="network-station-tab-group__sidebar-toggle"
        colorVariant={sidebarVisible ? 'accent' : 'primary'}
        instantAction
        ariaLabel={sidebarVisible ? 'Hide filters panel' : 'Show filters panel'}
        title={sidebarVisible ? 'Hide filters panel' : 'Show filters panel'}
        icon={<SidebarSimple size={16} weight="bold" aria-hidden />}
        onClick={() => onSidebarVisibleChange(!sidebarVisible)}
        style={
          toggleSizePx != null
            ? ({
                ['--network-sidebar-toggle-size' as string]: `${toggleSizePx}px`,
              } as React.CSSProperties)
            : undefined
        }
      />
      {tabs}
    </div>
  )
}

export default NetworkStationTabGroup
