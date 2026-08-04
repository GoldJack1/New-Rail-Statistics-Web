'use client'

import React from 'react'
import CollapsibleSection from '@/components/misc/CollapsibleSection/CollapsibleSection'
import { BUTBaseButtonBar as ButtonBar } from '../../buttons'
import { BUTBaseButton as Button } from '../../buttons'
import type { StationAdminDisplayMode } from '../../../utils/stationAdminDisplayModeStorage'
import './StationAdminControls.css'

interface StationAdminViewControlsProps {
  displayMode: StationAdminDisplayMode
  onDisplayModeChange: (mode: StationAdminDisplayMode) => void
  onAssignHeaders?: () => void
  onResetTableSort?: () => void
  canResetTableSort?: boolean
  tableModeDisabled?: boolean
  className?: string
}

const StationAdminViewControls: React.FC<StationAdminViewControlsProps> = ({
  displayMode,
  onDisplayModeChange,
  onAssignHeaders,
  onResetTableSort,
  canResetTableSort = false,
  tableModeDisabled = false,
  className,
}) => {
  const showAssignHeaders = displayMode === 'table' && Boolean(onAssignHeaders)
  const showResetTableSort =
    displayMode === 'table' && Boolean(onResetTableSort)
  const showTableColumnControls = showAssignHeaders || showResetTableSort

  return (
    <section
      className={['station-admin-controls-card', 'station-admin-view-controls-card', className]
        .filter(Boolean)
        .join(' ')}
      aria-label="Station view controls"
    >
      <div className="station-admin-controls-group">
        <span className="station-admin-controls-label">Layout</span>
        <ButtonBar
          buttons={[
            { label: 'Cards', value: 'cards' },
            { label: 'Table', value: 'table', disabled: tableModeDisabled },
          ]}
          selectedIndex={displayMode === 'table' ? 1 : 0}
          onChange={(_, value) => {
            if (!value || (tableModeDisabled && value === 'table')) return
            onDisplayModeChange(value as StationAdminDisplayMode)
          }}
        />
        {tableModeDisabled && (
          <p className="station-admin-controls-note">
            Table mode is available on tablet, laptop, and desktop only. Mobile uses card view.
          </p>
        )}
      </div>

      <CollapsibleSection
        isExpanded={showTableColumnControls}
        className="station-admin-controls-reveal"
        ariaHidden={!showTableColumnControls}
      >
        <div className="station-admin-controls-group">
          <span className="station-admin-controls-label">Table columns</span>
          {showAssignHeaders && (
            <Button
              type="button"
              variant="wide"
              width="fill"
              className="station-admin-controls-action-button"
              onClick={onAssignHeaders}
            >
              Assign headers
            </Button>
          )}
          {showResetTableSort && (
            <Button
              type="button"
              variant="wide"
              width="fill"
              className="station-admin-controls-action-button"
              onClick={onResetTableSort}
              disabled={!canResetTableSort}
            >
              Reset column sort
            </Button>
          )}
        </div>
      </CollapsibleSection>
    </section>
  )
}

export default StationAdminViewControls
