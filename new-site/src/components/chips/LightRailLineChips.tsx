'use client'

import { BUTOperatorChip } from '../buttons'
import { useTheme } from '@/hooks/useTheme'
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
  const { theme } = useTheme()
  const lines = parseLightRailLinesServed(linesServed ?? '')
  const rootClass = ['light-rail-lines-chips', className].filter(Boolean).join(' ')

  if (lines.length === 0) {
    if (!emptyLabel) return null
    return <span className="light-rail-lines-chips-empty">{emptyLabel}</span>
  }

  return (
    <div className={rootClass} role="list" aria-label="Lines served">
      {lines.map((line) => {
        const colors = getLightRailLineChipColors(line, theme)
        const label = `${line}${labelSuffix}`
        return (
          <BUTOperatorChip
            key={line}
            instantAction
            colorVariant="primary"
            width="hug"
            role="listitem"
            className="light-rail-lines-chip"
            ariaLabel={label}
            title={label}
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              borderColor: colors.bg,
            }}
          >
            {label}
          </BUTOperatorChip>
        )
      })}
    </div>
  )
}

export default LightRailLineChips
