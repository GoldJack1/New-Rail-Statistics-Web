'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BUTTabButton } from '@/components/buttons'
import {
  LIGHT_RAIL_LINE_OPTIONS,
  type LightRailLineOption,
} from '@/utils/lightRailStationFields'
import {
  isSupertramLineFilterAll,
  toggleSupertramLineFilter,
  type SupertramLineFilter,
} from '@/utils/stationsListFiltersStorage'

interface StationsLineFilterTabsProps {
  value: SupertramLineFilter
  onChange: (value: SupertramLineFilter) => void
  /** When the tabs sit inside a collapsible, remount fades after it opens. */
  isVisible?: boolean
}

const StationsLineFilterTabs: React.FC<StationsLineFilterTabsProps> = ({
  value,
  onChange,
  isVisible = true,
}) => {
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const [fades, setFades] = useState({ left: false, right: false })
  const isAllSelected = isSupertramLineFilterAll(value)

  const updateFades = useCallback(() => {
    const tabs = tabsRef.current
    if (!tabs) return
    const { scrollLeft, scrollWidth, clientWidth } = tabs
    const maxScroll = scrollWidth - clientWidth
    const left = scrollLeft > 1
    const right = maxScroll > 1 && scrollLeft < maxScroll - 1
    setFades((current) =>
      current.left === left && current.right === right ? current : { left, right }
    )
  }, [])

  useEffect(() => {
    if (!isVisible) {
      setFades({ left: false, right: false })
      return
    }

    updateFades()
    /* Collapse open animation (~220ms) — remasure after layout settles. */
    const settleTimer = window.setTimeout(updateFades, 250)

    const tabs = tabsRef.current
    if (!tabs || typeof ResizeObserver === 'undefined') {
      return () => window.clearTimeout(settleTimer)
    }

    const observer = new ResizeObserver(() => updateFades())
    observer.observe(tabs)
    return () => {
      window.clearTimeout(settleTimer)
      observer.disconnect()
    }
  }, [updateFades, value, isVisible])

  const handleLineClick = (line: LightRailLineOption) => {
    onChange(toggleSupertramLineFilter(value, line))
  }

  return (
    <div
      className={[
        'stations-line-filter-tabs-wrap',
        fades.left ? 'stations-line-filter-tabs-wrap--fade-left' : '',
        fades.right ? 'stations-line-filter-tabs-wrap--fade-right' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        ref={tabsRef}
        className="network-station-tab-group stations-line-filter-tabs"
        role="group"
        aria-label="SuperTram lines"
        onScroll={updateFades}
      >
        <BUTTabButton
          type="button"
          width="hug"
          instantAction
          pressed={isAllSelected}
          ariaSelected={isAllSelected}
          onClick={() => onChange([])}
        >
          <span className="network-station-tab-group__label">All</span>
        </BUTTabButton>
        {LIGHT_RAIL_LINE_OPTIONS.map((line) => {
          const isSelected = !isAllSelected && value.includes(line)
          return (
            <BUTTabButton
              key={line}
              type="button"
              width="hug"
              instantAction
              pressed={isSelected}
              ariaSelected={isSelected}
              onClick={() => handleLineClick(line)}
            >
              <span className="network-station-tab-group__label">{line}</span>
            </BUTTabButton>
          )
        })}
      </div>
    </div>
  )
}

export default StationsLineFilterTabs
