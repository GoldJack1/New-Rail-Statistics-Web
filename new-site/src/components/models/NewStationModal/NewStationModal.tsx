'use client'

import React, { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'
import '../StationModal/StationModal.css'
import '../StationEditModal/StationEditModal.css'
import { BUTBaseButton as Button } from '../../buttons'
import NewStationForm from '../StationDetails/NewStationForm'
import ChooseNetworkForNewStationModal from '../ChooseNetworkForNewStationModal/ChooseNetworkForNewStationModal'
import { useNextStationId } from '../../../hooks/useNextStationId'
import { useStationCollectionFieldSchema } from '../../../hooks/useStationCollectionFieldSchema'
import type { NetworkCollectionId } from '../../../constants/stationCollections'

interface NewStationModalProps {
  isOpen: boolean
  onClose: () => void
}

interface NewStationModalFormProps {
  targetCollectionId: NetworkCollectionId
  onClose: () => void
}

const NewStationModalForm: React.FC<NewStationModalFormProps> = ({ targetCollectionId, onClose }) => {
  const { nextStationId, loading: idLoading } = useNextStationId(targetCollectionId)
  const { fieldSchema, loading: schemaLoading } = useStationCollectionFieldSchema(targetCollectionId)
  const loading = idLoading || schemaLoading

  if (loading) {
    return (
      <div className="modal-body">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <NewStationForm
      nextStationId={nextStationId}
      targetCollectionId={targetCollectionId}
      onCancel={onClose}
      onCreated={() => onClose()}
      hideNetworkPicker
      fieldSchema={fieldSchema}
    />
  )
}

const NewStationModal: React.FC<NewStationModalProps> = ({ isOpen, onClose }) => {
  const [targetCollectionId, setTargetCollectionId] = useState<NetworkCollectionId | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setTargetCollectionId(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  if (!targetCollectionId) {
    return (
      <ChooseNetworkForNewStationModal
        open
        onConfirm={setTargetCollectionId}
        onCancel={onClose}
      />
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-edit" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add new station</h2>
          <Button
            type="button"
            variant="circle"
            className="modal-close"
            ariaLabel="Close modal"
            onClick={() => onClose()}
            icon={<X size={24} weight="regular" aria-hidden />}
          />
        </div>
        <NewStationModalForm targetCollectionId={targetCollectionId} onClose={onClose} />
      </div>
    </div>
  )
}

export default NewStationModal
