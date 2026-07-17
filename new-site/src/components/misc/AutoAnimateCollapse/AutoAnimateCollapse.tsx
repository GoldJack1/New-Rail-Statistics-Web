'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type TransitionEvent } from 'react'
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
  const hasMountedRef = useRef(false)

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setIsAnimating(true)

    if (isOpen) {
      setIsContentVisible(true)
      setIsSettledOpen(false)

      if (prefersReducedMotion) {
        setIsSettledOpen(true)
        setIsAnimating(false)
      }

      return
    }

    if (prefersReducedMotion) {
      setIsSettledOpen(false)
      setIsContentVisible(false)
      setIsAnimating(false)
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
        {/* Unmount when fully closed to avoid style/layout work for hidden sidebar panels. */}
        {isOpen || isContentVisible ? children : null}
      </div>
    </div>
  )
}

export default AutoAnimateCollapse
