'use client'

import React from 'react'
import type { Icon } from '@phosphor-icons/react'

interface StationSectionTitleProps {
  title: string
  icon?: Icon | null
  className?: string
  /**
   * Primary tab heading. Hidden on narrow viewports where the section menu bar
   * already shows the selected page title.
   */
  pageHeading?: boolean
}

export function StationSectionTitle({
  title,
  icon: IconComponent,
  className,
  pageHeading = false,
}: StationSectionTitleProps) {
  return (
    <h3
      className={[
        'modal-section-title',
        'station-section-title',
        pageHeading ? 'station-section-title--page-heading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {IconComponent ? (
        <IconComponent className="station-section-title__icon" size={20} weight="regular" aria-hidden />
      ) : null}
      <span className="station-section-title__text">{title}</span>
    </h3>
  )
}

export default StationSectionTitle
