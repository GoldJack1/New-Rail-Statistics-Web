'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { BUTBaseButton as Button, BUTOperatorChip, BUTWideButton } from '../../buttons'
import TextCard from '../TextCard/TextCard'
import {
  addTableColumnSlot,
  DEFAULT_TABLE_COLUMN_SLOT_COUNT,
  getAvailableTableColumnKeys,
  getDefaultTableColumnSlots,
  getTableFieldKeyFromLabel,
  getTableFieldLabel,
  getTableFieldOptionLabelsForNetwork,
  MAX_TABLE_COLUMN_SLOT_COUNT,
  removeTableColumnSlot,
  type StationsTableColumnSlot,
} from '../../../utils/stationsTableColumnCatalog'
import type { NetworkViewFilter } from '../../../constants/stationCollections'
import type { StationCollectionFieldSchema } from '../../../utils/stationCollectionFieldSchema'
import '../../models/StationModal/StationModal.css'
import './StationsTableColumnsModal.css'

interface StationsTableColumnsModalProps {
  open: boolean
  slots: StationsTableColumnSlot[]
  networkView: NetworkViewFilter
  fieldSchema: StationCollectionFieldSchema
  onApply: (slots: StationsTableColumnSlot[]) => void
  onClose: () => void
}

const StationsTableColumnsModal: React.FC<StationsTableColumnsModalProps> = ({
  open,
  slots,
  networkView,
  fieldSchema,
  onApply,
  onClose,
}) => {
  const [draftSlots, setDraftSlots] = useState<StationsTableColumnSlot[]>(slots)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const fieldOptions = useMemo(
    () => getTableFieldOptionLabelsForNetwork(networkView, fieldSchema),
    [networkView, fieldSchema]
  )
  const allowedFields = useMemo(
    () => getAvailableTableColumnKeys(networkView, fieldSchema),
    [networkView, fieldSchema]
  )

  const getFieldOptionsForSlot = (slot: StationsTableColumnSlot): string[] => {
    const selectedLabel = getTableFieldLabel(slot.field)
    if (fieldOptions.includes(selectedLabel)) return fieldOptions
    return [selectedLabel, ...fieldOptions]
  }

  useEffect(() => {
    if (open) {
      setDraftSlots(slots)
      setSelectedSlotIndex(0)
    }
  }, [open, slots])

  useEffect(() => {
    setSelectedSlotIndex((current) => Math.min(current, Math.max(0, draftSlots.length - 1)))
  }, [draftSlots.length])

  if (!open) return null

  const selectedSlot = draftSlots[selectedSlotIndex]
  const selectedSlotFieldOptions = selectedSlot ? getFieldOptionsForSlot(selectedSlot) : fieldOptions
  const selectedSlotLabel = selectedSlot ? getTableFieldLabel(selectedSlot.field) : ''

  const updateSlotField = (index: number, label: string) => {
    const field = getTableFieldKeyFromLabel(label)
    if (!field) return
    setDraftSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { field } : slot))
    )
  }

  const handleResetDefaults = () => {
    setDraftSlots(getDefaultTableColumnSlots(networkView))
    setSelectedSlotIndex(0)
  }

  const handleAddColumn = () => {
    const next = addTableColumnSlot(draftSlots, allowedFields)
    setDraftSlots(next)
    setSelectedSlotIndex(next.length - 1)
  }

  const handleRemoveColumn = () => {
    setDraftSlots((current) => removeTableColumnSlot(current))
  }

  const canAddColumn = draftSlots.length < MAX_TABLE_COLUMN_SLOT_COUNT
  const canRemoveColumn = draftSlots.length > DEFAULT_TABLE_COLUMN_SLOT_COUNT

  const handleApply = () => {
    onApply(draftSlots)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content stations-table-columns-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stations-table-columns-modal-title"
      >
        <div className="modal-header stations-table-columns-modal__header">
          <div className="stations-table-columns-modal__header-text">
            <h2 id="stations-table-columns-modal-title" className="modal-title">
              Assign table headers
            </h2>
            <p className="stations-table-columns-modal__intro">
              Pick a column on the left, then choose its field on the right. Column 1 is the leftmost table header.
            </p>
            <p className="stations-table-columns-modal__header-note">
              {draftSlots.length} of {MAX_TABLE_COLUMN_SLOT_COUNT} columns ({DEFAULT_TABLE_COLUMN_SLOT_COUNT} by
              default). Changes reset when you reload the page.
            </p>
          </div>
          <Button
            type="button"
            variant="circle"
            className="modal-close"
            ariaLabel="Close"
            onClick={onClose}
            colorVariant="primary"
            icon={<X size={24} weight="regular" aria-hidden />}
          />
        </div>

        <div className="stations-table-columns-modal__workspace">
          <section className="stations-table-columns-modal__columns-panel" aria-label="Table columns">
            <div className="stations-table-columns-modal__panel-head">
              <h3 className="stations-table-columns-modal__panel-title">Columns</h3>
              <div className="stations-table-columns-modal__panel-actions">
                <BUTWideButton
                  type="button"
                  width="hug"
                  colorVariant="primary"
                  onClick={handleAddColumn}
                  disabled={!canAddColumn}
                >
                  Add
                </BUTWideButton>
                <BUTWideButton
                  type="button"
                  width="hug"
                  colorVariant="primary"
                  onClick={handleRemoveColumn}
                  disabled={!canRemoveColumn}
                >
                  Remove
                </BUTWideButton>
              </div>
            </div>

            <ul className="stations-table-columns-modal__slot-list">
              {draftSlots.map((slot, index) => {
                const label = getTableFieldLabel(slot.field)
                const isSelected = index === selectedSlotIndex

                return (
                  <li key={`header-slot-${index}`}>
                    <TextCard
                      className="stations-table-columns-modal__slot-card"
                      title={`Column ${index + 1}`}
                      description={label}
                      state={isSelected ? 'accent' : 'default'}
                      pressed={isSelected}
                      onClick={() => setSelectedSlotIndex(index)}
                      ariaLabel={`Column ${index + 1}, ${label}`}
                    />
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="stations-table-columns-modal__fields-panel" aria-label="Field options">
            <div className="stations-table-columns-modal__panel-head">
              <div className="stations-table-columns-modal__fields-heading">
                <h3 className="stations-table-columns-modal__panel-title">
                  Field for column {selectedSlotIndex + 1}
                </h3>
                <p className="stations-table-columns-modal__fields-current">
                  Current: <strong>{selectedSlotLabel}</strong>
                </p>
              </div>
            </div>

            <div
              className="stations-table-columns-modal__chip-grid"
              role="group"
              aria-label={`Field options for column ${selectedSlotIndex + 1}`}
            >
              {selectedSlotFieldOptions.map((label) => (
                <BUTOperatorChip
                  key={`${selectedSlotIndex}-${label}`}
                  instantAction
                  colorVariant="primary"
                  width="hug"
                  state={selectedSlotLabel === label ? 'pressed' : 'active'}
                  onClick={() => updateSlotField(selectedSlotIndex, label)}
                  aria-label={`Set column ${selectedSlotIndex + 1} to ${label}`}
                >
                  {label}
                </BUTOperatorChip>
              ))}
            </div>
          </section>
        </div>

        <div className="stations-table-columns-modal__footer">
          <BUTWideButton type="button" width="hug" colorVariant="red-action" onClick={handleResetDefaults}>
            Reset defaults
          </BUTWideButton>
          <div className="stations-table-columns-modal__footer-actions">
            <BUTWideButton type="button" width="hug" colorVariant="primary" onClick={onClose}>
              Cancel
            </BUTWideButton>
            <BUTWideButton type="button" width="hug" colorVariant="green-action" onClick={handleApply}>
              Apply headers
            </BUTWideButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StationsTableColumnsModal
