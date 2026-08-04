'use client'

import { useTheme } from '@/hooks/useTheme'
import {
  getLightRailLineChipColors,
  parseLightRailLinesServed,
} from '../../utils/lightRailStationFields'
import './LightRailLineStrip.css'

interface LightRailLineStripProps {
  linesServed: string | null | undefined
}

export function LightRailLineStrip({ linesServed }: LightRailLineStripProps) {
  const { theme } = useTheme()
  const lines = parseLightRailLinesServed(linesServed ?? '')
  if (lines.length === 0) return null

  return (
    <div className="light-rail-line-strip" role="list" aria-label="Lines served">
      {lines.map((line) => {
        const colors = getLightRailLineChipColors(line, theme)
        return (
          <span
            key={line}
            className="light-rail-line-strip__segment"
            role="listitem"
            title={line}
            aria-label={line}
            style={{ backgroundColor: colors.bg }}
          />
        )
      })}
    </div>
  )
}

export default LightRailLineStrip
