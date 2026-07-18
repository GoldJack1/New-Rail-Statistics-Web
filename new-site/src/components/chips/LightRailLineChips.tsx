'use client'

import {
  getLightRailLineChipColors,
  parseLightRailLinesServed,
} from '../../utils/lightRailStationFields'
import './LightRailLineChips.css'

interface LightRailLineChipsProps {
  linesServed: string | null | undefined
  className?: string
  emptyLabel?: string
  /** Appended to each line label (e.g. ` Route` → "Blue Route"). */
  labelSuffix?: string
}

export function LightRailLineChips({
  linesServed,
  className,
  emptyLabel,
  labelSuffix = '',
}: LightRailLineChipsProps) {
  const lines = parseLightRailLinesServed(linesServed ?? '')
  const rootClass = ['light-rail-lines-chips', className].filter(Boolean).join(' ')

  if (lines.length === 0) {
    if (!emptyLabel) return null
    return <span className="light-rail-lines-chips-empty">{emptyLabel}</span>
  }

  return (
    <div className={rootClass} role="list" aria-label="Lines served">
      {lines.map((line) => {
        const colors = getLightRailLineChipColors(line)
        return (
          <span
            key={line}
            className="light-rail-lines-chip"
            role="listitem"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {`${line}${labelSuffix}`}
          </span>
        )
      })}
    </div>
  )
}

export default LightRailLineChips
