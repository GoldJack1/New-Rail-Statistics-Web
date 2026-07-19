'use client'

import React from 'react'
import { stationDetailsSubsectionId } from '@/utils/stationDetailsTabSubheaders'

interface StationDetailsSubsectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function StationDetailsSubsection({ title, children, className }: StationDetailsSubsectionProps) {
  return (
    <div
      id={stationDetailsSubsectionId(title)}
      className={['station-details-subsection', className].filter(Boolean).join(' ')}
    >
      <h4 className="station-details-subsection__title">{title}</h4>
      {children}
    </div>
  )
}

export default StationDetailsSubsection
