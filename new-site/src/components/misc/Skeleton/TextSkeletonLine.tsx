'use client'

import React from 'react'
import { Skeleton } from './Skeleton'
import './TextSkeletonLine.css'

type TextSkeletonLineProps = {
  children: string
  className?: string
}

/**
 * Invisible placeholder text keeps real font metrics / spacing.
 * Shimmer bar is 1em tall (glyph em-square), centered in the line box.
 */
export function TextSkeletonLine({ children, className = '' }: TextSkeletonLineProps) {
  return (
    <span
      className={['station-details-text-skeleton', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {children}
      <Skeleton className="station-details-text-skeleton__bar" />
    </span>
  )
}

export default TextSkeletonLine
