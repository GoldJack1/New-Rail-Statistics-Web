'use client'

import type { ReactNode } from 'react'
import AutoAnimateCollapse from '@/components/misc/AutoAnimateCollapse/AutoAnimateCollapse'

interface CollapsibleSectionProps {
  isExpanded: boolean
  children: ReactNode
  className?: string
  innerClassName?: string
  ariaHidden?: boolean
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  isExpanded,
  children,
  className = '',
  innerClassName = '',
  ariaHidden,
}) => {
  return (
    <AutoAnimateCollapse
      isOpen={isExpanded}
      className={className}
      itemClassName={innerClassName}
      ariaHidden={ariaHidden ?? !isExpanded}
    >
      {children}
    </AutoAnimateCollapse>
  )
}

export default CollapsibleSection
