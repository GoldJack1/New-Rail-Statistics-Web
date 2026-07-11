'use client'

import { useCallback, useEffect, useState, type ReactNode, type TransitionEvent } from 'react'
import './AutoAnimateCollapse.css'

interface AutoAnimateCollapseProps {
  isOpen: boolean
  children: ReactNode
  className?: string
  itemClassName?: string
  id?: string
  ariaHidden?: boolean
}

const AutoAnimateCollapse: React.FC<AutoAnimateCollapseProps> = ({
  isOpen,
  children,
  className = '',
  itemClassName = '',
  id,
  ariaHidden,
}) => {
  const [isSettledOpen, setIsSettledOpen] = useState(isOpen)
  const [isContentVisible, setIsContentVisible] = useState(isOpen)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)

    if (isOpen) {
      setIsContentVisible(true)
      setIsSettledOpen(false)
    }
  }, [isOpen])

  const handleTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      if (event.propertyName !== 'grid-template-rows') return

      setIsAnimating(false)

      if (isOpen) {
        setIsSettledOpen(true)
        return
      }

      setIsSettledOpen(false)
      setIsContentVisible(false)
    },
    [isOpen]
  )

  return (
    <div
      className={[
        'collapse-panel',
        isOpen ? 'collapse-panel--open' : '',
        isSettledOpen ? 'collapse-panel--settled' : '',
        isAnimating ? 'collapse-panel--animating' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        id={id}
        className={[
          'collapse-panel__item',
          isContentVisible ? '' : 'collapse-panel__item--concealed',
          itemClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={ariaHidden ?? !isOpen}
      >
        {children}
      </div>
    </div>
  )
}

export default AutoAnimateCollapse
