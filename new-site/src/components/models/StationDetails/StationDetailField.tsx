'use client'

import { findPendingFieldChange } from '../../../utils/applyPendingChangesForDisplay'
import type { StationFieldChange } from '../../../utils/stationFieldDiffs'
import { getStationDetailFieldIcon } from '../../../utils/stationDetailFieldIcons'

interface StationDetailFieldProps {
  label: string
  value: string
  pendingFieldChanges?: StationFieldChange[]
  /** Optional key for icon lookup (defaults to label). */
  iconKey?: string | null
  showIcon?: boolean
}

export function StationDetailField({
  label,
  value,
  pendingFieldChanges,
  iconKey,
  showIcon = false,
}: StationDetailFieldProps) {
  const pending = findPendingFieldChange(label, pendingFieldChanges ?? [])
  const IconComponent = showIcon ? getStationDetailFieldIcon(iconKey ?? label) : null

  return (
    <div className={`modal-detail-item${pending ? ' modal-detail-item--pending' : ''}`}>
      <div className="modal-detail-label-row">
        {IconComponent ? (
          <IconComponent className="modal-detail-field-icon" size={16} weight="regular" aria-hidden />
        ) : null}
        <span className="modal-detail-label">{label}</span>
      </div>
      <span className="modal-detail-value">{value}</span>
      {pending && <span className="modal-detail-pending-from">{pending.from}</span>}
    </div>
  )
}

export default StationDetailField
