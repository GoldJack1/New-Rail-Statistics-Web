'use client'

import React from 'react'
import CollapsibleSection from '@/components/misc/CollapsibleSection/CollapsibleSection'
import BUTDDMListActionDual from '../../buttons/ddm/BUTDDMListActionDual'
import { BUTBaseButtonBar as ButtonBar } from '../../buttons'
import { BUTBaseButton as Button } from '../../buttons'
import './StationAdminControls.css'

interface StationAdminControlsProps {
  isEditMode: boolean
  pendingChangesCount: number
  onModeChange: (mode: 'view' | 'edit') => void
  onOpenPendingChanges: () => void
  onAddStation: () => void
  fareZoneOptions?: string[]
  selectedFareZonePositions?: number[]
  onFareZoneSelectionChange?: (selectedItems: string[]) => void
  className?: string
}

const StationAdminControls: React.FC<StationAdminControlsProps> = ({
  isEditMode,
  pendingChangesCount,
  onModeChange,
  onOpenPendingChanges,
  onAddStation,
  fareZoneOptions,
  selectedFareZonePositions = [],
  onFareZoneSelectionChange,
  className,
}) => {
  const showFareZoneFilter =
    Boolean(fareZoneOptions?.length) && Boolean(onFareZoneSelectionChange)

  return (
    <section
      className={['station-admin-controls-card', className].filter(Boolean).join(' ')}
      aria-label="Station admin controls"
    >
      <div className="station-admin-controls-group station-admin-controls-group--pending">
        <Button
          type="button"
          variant="wide"
          width="fill"
          colorVariant={pendingChangesCount > 0 ? 'accent' : 'primary'}
          onClick={onOpenPendingChanges}
        >
          Pending changes ({pendingChangesCount})
        </Button>
      </div>

      <div className="station-admin-controls-group">
        <span className="station-admin-controls-label">Mode</span>
        <ButtonBar
          buttons={[
            { label: 'View only', value: 'view' },
            { label: 'Edit', value: 'edit' },
          ]}
          selectedIndex={isEditMode ? 1 : 0}
          onChange={(_, value) => onModeChange(value as 'view' | 'edit')}
        />
      </div>

      <CollapsibleSection
        isExpanded={isEditMode}
        className="station-admin-controls-reveal"
        ariaHidden={!isEditMode}
      >
        <div className="station-admin-controls-group">
          <span className="station-admin-controls-label">Stations</span>
          <Button
            type="button"
            variant="wide"
            width="fill"
            className="station-admin-controls-action-button"
            onClick={onAddStation}
          >
            + Add new station
          </Button>
        </div>
      </CollapsibleSection>

      {showFareZoneFilter && (
        <div className="station-admin-controls-group">
          <span className="station-admin-controls-label">Fare Zone</span>
          <BUTDDMListActionDual
            items={fareZoneOptions!}
            filterName="Fare Zones"
            selectionMode="multi"
            selectedPositions={selectedFareZonePositions}
            onSelectionChanged={(_, selectedItems) => onFareZoneSelectionChange!(selectedItems)}
            colorVariant="primary"
          />
        </div>
      )}
    </section>
  )
}

export default StationAdminControls
