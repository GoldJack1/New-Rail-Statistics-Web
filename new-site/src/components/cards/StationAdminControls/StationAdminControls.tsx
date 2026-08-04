'use client'

import React from 'react'
import CollapsibleSection from '@/components/misc/CollapsibleSection/CollapsibleSection'
import BUTDDMListActionDual from '../../buttons/ddm/BUTDDMListActionDual'
import { BUTBaseButtonBar as ButtonBar } from '../../buttons'
import { BUTBaseButton as Button } from '../../buttons'
import { TOGToggleVisited } from '../../buttons'
import './StationAdminControls.css'

interface StationAdminControlsProps {
  pendingChangesCount: number
  onOpenPendingChanges: () => void
  className?: string
  /** List page: view/edit mode + add station + optional fare zones. Map: view/edit + add-station mode. */
  variant?: 'list' | 'map'
  isEditMode?: boolean
  onModeChange?: (mode: 'view' | 'edit') => void
  onAddStation?: () => void
  fareZoneOptions?: string[]
  selectedFareZonePositions?: number[]
  onFareZoneSelectionChange?: (selectedItems: string[]) => void
  isAddStationMode?: boolean
  onAddStationModeChange?: (active: boolean) => void
  /** Map + SuperTram: timeline camera follow (temporary home under Admin). */
  showTimelineFollow?: boolean
  timelineFollowAppearing?: boolean
  onTimelineFollowAppearingChange?: (enabled: boolean) => void
  timelineShowOrderOfOpening?: boolean
  onTimelineShowOrderOfOpeningChange?: (enabled: boolean) => void
}

const StationAdminControls: React.FC<StationAdminControlsProps> = ({
  pendingChangesCount,
  onOpenPendingChanges,
  className,
  variant = 'list',
  isEditMode = false,
  onModeChange,
  onAddStation,
  fareZoneOptions,
  selectedFareZonePositions = [],
  onFareZoneSelectionChange,
  isAddStationMode = false,
  onAddStationModeChange,
  showTimelineFollow = false,
  timelineFollowAppearing = false,
  onTimelineFollowAppearingChange,
  timelineShowOrderOfOpening = false,
  onTimelineShowOrderOfOpeningChange,
}) => {
  const showFareZoneFilter =
    variant === 'list' &&
    Boolean(fareZoneOptions?.length) &&
    Boolean(onFareZoneSelectionChange)

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

      {variant === 'map' ? (
        <>
          {onModeChange ? (
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
          ) : null}

          {onAddStationModeChange ? (
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
                  colorVariant={isAddStationMode ? 'accent' : 'primary'}
                  aria-pressed={isAddStationMode}
                  className="station-admin-controls-action-button"
                  onClick={() => onAddStationModeChange(!isAddStationMode)}
                >
                  Add station mode
                </Button>
              </div>
            </CollapsibleSection>
          ) : null}

          {showTimelineFollow &&
          (onTimelineFollowAppearingChange || onTimelineShowOrderOfOpeningChange) ? (
            <div className="station-admin-controls-group">
              <span className="station-admin-controls-label">Timeline</span>
              {onTimelineShowOrderOfOpeningChange ? (
                <div className="station-admin-controls-follow">
                  <div className="station-admin-controls-follow-copy">
                    <span className="station-admin-controls-follow-title">Show order number</span>
                    <span className="station-admin-controls-follow-hint">
                      Show · #N on the timeline date
                    </span>
                  </div>
                  <TOGToggleVisited
                    checked={timelineShowOrderOfOpening}
                    onChange={onTimelineShowOrderOfOpeningChange}
                    ariaLabel={
                      timelineShowOrderOfOpening
                        ? 'Hide order of opening on timeline'
                        : 'Show order of opening on timeline'
                    }
                  />
                </div>
              ) : null}
              {onTimelineFollowAppearingChange ? (
                <div className="station-admin-controls-follow">
                  <div className="station-admin-controls-follow-copy">
                    <span className="station-admin-controls-follow-title">Follow stops</span>
                    <span className="station-admin-controls-follow-hint">
                      Zoom in and pan as each stop appears
                    </span>
                  </div>
                  <TOGToggleVisited
                    checked={timelineFollowAppearing}
                    onChange={onTimelineFollowAppearingChange}
                    ariaLabel={
                      timelineFollowAppearing
                        ? 'Turn off follow stops camera'
                        : 'Turn on follow stops camera'
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {onModeChange ? (
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
          ) : null}

          {onAddStation ? (
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
          ) : null}
        </>
      )}

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
