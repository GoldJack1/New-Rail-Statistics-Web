'use client'

import { findPendingFieldChange } from '../../../utils/applyPendingChangesForDisplay'
import type { StationFieldChange } from '../../../utils/stationFieldDiffs'
import { BUTOperatorChip } from '../../buttons'
import { useTocOperators } from '../../../hooks/useTocOperators'
import {
  getTocOperatorChipColors,
  resolveTocOperatorDisplayName,
} from '../../../services/tocOperators'
import '../../chips/LightRailLineChips.css'
import './LightRailLinesServedChips.css'

const BLANK_DISPLAY = '---'

interface StationTocChipsProps {
  toc: string | null | undefined
  /** Knowledgebase StationOperator — shown in the chip as TOC CODE. */
  tocCode?: string | null
  tocCodeStatus?: 'idle' | 'loading' | 'ready' | 'error'
  pendingFieldChanges?: StationFieldChange[]
  /** When false, skip Firestore/CDN `toc_operators` fetch (e.g. light-rail). Default true. */
  enabled?: boolean
}

/** Split TOC on commas (same idea as Supertram lines served). */
export function parseStationTocValues(raw: string | null | undefined): string[] {
  if (!raw || String(raw).trim() === '') return []
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

function formatManagedByChipLabel(displayName: string, tocCode: string | null): string {
  if (displayName && tocCode) return `${displayName} (${tocCode})`
  return displayName || tocCode || ''
}

/** TOC in Details Other: “Station Managed by:” + coloured BUTOperatorChips (name + TOC CODE). */
export function StationTocChips({
  toc,
  tocCode = null,
  tocCodeStatus = 'idle',
  pendingFieldChanges,
  enabled = true,
}: StationTocChipsProps) {
  const pending = findPendingFieldChange('TOC', pendingFieldChanges ?? [])
  const values = parseStationTocValues(toc)
  const codeLoading = tocCodeStatus === 'loading' || tocCodeStatus === 'idle'
  const resolvedCode = codeLoading ? null : tocCode?.trim() || null
  const tocOperators = useTocOperators(enabled && (values.length > 0 || Boolean(resolvedCode)))

  const chipEntries =
    values.length > 0
      ? values.map((rawName, index) => ({
          key: rawName,
          rawName,
          code: index === 0 ? resolvedCode : null,
        }))
      : resolvedCode || codeLoading
        ? [{ key: 'toc-code', rawName: resolvedCode ?? '', code: resolvedCode }]
        : []

  return (
    <div className={`modal-detail-item station-toc-detail${pending ? ' modal-detail-item--pending' : ''}`}>
      <span className="modal-detail-label">Station Managed by:</span>
      {chipEntries.length === 0 ? (
        <span className="light-rail-lines-chips-empty">{BLANK_DISPLAY}</span>
      ) : (
        <div className="station-toc-detail__chips" role="list" aria-label="Station managed by">
          {chipEntries.map((entry) => {
            const displayName = entry.rawName
              ? resolveTocOperatorDisplayName(tocOperators.operators, entry.rawName)
              : ''
            const colors = entry.rawName
              ? getTocOperatorChipColors(tocOperators.operators, entry.rawName)
              : { bg: '#64748b', text: '#ffffff' }
            const codeForChip = codeLoading && entry.key === chipEntries[0]?.key ? '…' : entry.code
            const label = formatManagedByChipLabel(displayName, codeForChip)
            return (
              <BUTOperatorChip
                key={entry.key}
                instantAction
                colorVariant="primary"
                width="hug"
                className="station-toc-detail-chip"
                ariaLabel={`Station managed by ${label}`}
                title={label}
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderColor: colors.bg,
                }}
              >
                {label || BLANK_DISPLAY}
              </BUTOperatorChip>
            )
          })}
        </div>
      )}
      {pending && <span className="modal-detail-pending-from">{pending.from}</span>}
    </div>
  )
}

export default StationTocChips
