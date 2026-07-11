'use client'

import React from 'react'
import { X } from '@phosphor-icons/react'
import type { Station } from '../../../types'
import '../StationModal/StationModal.css'
import './StationEditModal.css'
import { BUTBaseButton as Button } from '../../buttons'
import StationDetailsEditForm from '../StationDetails/StationDetailsEditForm'

interface StationEditModalProps {
  station: Station | null
  isOpen: boolean
  onClose: () => void
}

const StationEditModal: React.FC<StationEditModalProps> = ({ station, isOpen, onClose }) => {
  if (!isOpen || !station) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-edit" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit: {station.stationName || 'Station'}</h2>
          <Button
            type="button"
            variant="circle"
            className="modal-close"
            ariaLabel="Close modal"
            onClick={() => onClose()}
            icon={<X size={24} weight="regular" aria-hidden />}
          />
        </div>
        <StationDetailsEditForm station={station} onCancel={onClose} onSaved={onClose} />
      </div>
    </div>
  )
}

export default StationEditModal
