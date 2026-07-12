'use client'

import React from 'react'
import './Skeleton.css'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
  shimmer?: boolean
  'aria-hidden'?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  style,
  shimmer = true,
  'aria-hidden': ariaHidden = true,
}) => (
  <span
    className={['skeleton', shimmer ? 'skeleton--shimmer' : '', className].filter(Boolean).join(' ')}
    style={style}
    aria-hidden={ariaHidden}
  />
)

interface SkeletonTextProps {
  width?: string | number
  className?: string
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ width = '100%', className = '' }) => (
  <Skeleton className={['skeleton--text', className].filter(Boolean).join(' ')} style={{ width }} />
)
