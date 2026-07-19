'use client'

import type { ReactNode } from 'react'
import './AutoAnimateCollapse.css'

interface AutoAnimateCollapseProps {
  isOpen: boolean
  children: ReactNode
  className?: string
  itemClassName?: string
  id?: string
  ariaHidden?: boolean
}

/**
 * Height open/close via grid 0fr ↔ 1fr — same approach as MobileHeader’s panel.
 * Keep children mounted so the transition isn’t fighting React mount/layout.
 */
const AutoAnimateCollapse: React.FC<AutoAnimateCollapseProps> = ({
  isOpen,
  children,
  className = '',
  itemClassName = '',
  id,
  ariaHidden,
}) => {
  return (
    <div
      className={['collapse-panel', isOpen ? 'collapse-panel--open' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        id={id}
        className={['collapse-panel__item', itemClassName].filter(Boolean).join(' ')}
        aria-hidden={ariaHidden ?? !isOpen}
        inert={isOpen ? undefined : true}
      >
        {children}
      </div>
    </div>
  )
}

export default AutoAnimateCollapse
