'use client'

import React from 'react'
import { BUTBaseButtonBar as ButtonBar } from '../../buttons'
import { BUTBaseButton as Button } from '../../buttons'
import type { StationAdminDisplayMode } from '../../../utils/stationAdminDisplayModeStorage'
import './StationAdminControls.css'

interface StationAdminViewControlsProps {
  displayMode: StationAdminDisplayMode
  onDisplayModeChange: (mode: StationAdminDisplayMode) => void
  onAssignHeaders?: () => void
  tableModeDisabled?: boolean
  className?: string
}

const StationAdminViewControls: React.FC<StationAdminViewControlsProps> = ({
  displayMode,
  onDisplayModeChange,
  onAssignHeaders,
  tableModeDisabled = false,
  className,
}) => {
  return (
    <section
      className={['station-admin-controls-card', className].filter(Boolean).join(' ')}
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

      {displayMode === 'table' && onAssignHeaders && (
        <div className="station-admin-controls-group">
          <span className="station-admin-controls-label">Table columns</span>
          <Button
            type="button"
            variant="wide"
            width="fill"
            className="station-admin-controls-action-button"
            onClick={onAssignHeaders}
          >
            Assign headers
          </Button>
        </div>
      )}
    </section>
  )
}

export default StationAdminViewControls
