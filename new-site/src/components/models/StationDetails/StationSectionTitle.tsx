'use client'

import React from 'react'
import type { Icon } from '@phosphor-icons/react'

interface StationSectionTitleProps {
  title: string
  icon?: Icon | null
  className?: string
}

export function StationSectionTitle({ title, icon: IconComponent, className }: StationSectionTitleProps) {
  return (
    <h3 className={['modal-section-title', 'station-section-title', className].filter(Boolean).join(' ')}>
      {IconComponent ? (
        <IconComponent className="station-section-title__icon" size={20} weight="regular" aria-hidden />
      ) : null}
      <span className="station-section-title__text">{title}</span>
    </h3>
  )
}

export default StationSectionTitle
