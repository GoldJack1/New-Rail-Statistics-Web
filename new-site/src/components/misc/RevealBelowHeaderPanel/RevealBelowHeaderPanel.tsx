'use client'

import React, { useLayoutEffect, useRef } from 'react'
import { useRevealBelowHeaderPanel } from '@/hooks/useRevealBelowHeaderPanel'
import './RevealBelowHeaderPanel.css'

interface RevealBelowHeaderPanelProps {
  isExpanded: boolean
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
  maskClassName?: string
  panelClassName?: string
  innerClassName?: string
  ariaHidden?: boolean
  measureDeps?: ReadonlyArray<unknown>
  /** When true, the header collapses with the panel (e.g. admin sidebar section). */
  collapseHeader?: boolean
  /** When true, skip the header overlap/mask spacing (e.g. main content swaps). */
  hideHeaderMask?: boolean
  /** Re-triggers the open animation when changed (e.g. table/card view swap). */
  replayKey?: unknown
}

const RevealBelowHeaderPanel: React.FC<RevealBelowHeaderPanelProps> = ({
  isExpanded,
  header,
  children,
  className = '',
  maskClassName = '',
  panelClassName = '',
  innerClassName = '',
  ariaHidden,
  measureDeps = [],
  collapseHeader = false,
  hideHeaderMask = false,
  replayKey,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const {
    innerRef,
    isPanelOpen,
    isClosing,
    isPanelSettled,
    animatedMaxHeight,
    updatePanelHeight,
    handlePanelTransitionEnd,
  } = useRevealBelowHeaderPanel({
    isExpanded,
    measureDeps,
    replayKey,
  })

  useLayoutEffect(() => {
    if (!collapseHeader || !sectionRef.current) return
    if (!isExpanded) {
      sectionRef.current.style.removeProperty('--reveal-section-height')
      return
    }

    updatePanelHeight()
    const sectionHeight = sectionRef.current.scrollHeight
    if (sectionHeight > 0) {
      sectionRef.current.style.setProperty('--reveal-section-height', `${sectionHeight}px`)
    }
  }, [collapseHeader, isExpanded, isPanelOpen, isClosing, animatedMaxHeight, updatePanelHeight, ...measureDeps])

  const rootClassName = [
    'reveal-below-header',
    collapseHeader ? 'reveal-below-header--collapsible' : '',
    collapseHeader && (isPanelOpen || isClosing) ? 'reveal-below-header--section-open' : '',
    hideHeaderMask ? 'reveal-below-header--no-header-mask' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const panel = (
    <div
      className={[
        'reveal-below-header__panel',
        isPanelOpen ? 'reveal-below-header__panel--open' : '',
        isClosing ? 'reveal-below-header__panel--closing' : '',
        isPanelSettled ? 'reveal-below-header__panel--settled' : '',
        panelClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ maxHeight: animatedMaxHeight }}
      onTransitionEnd={handlePanelTransitionEnd}
      aria-hidden={ariaHidden ?? !isExpanded}
    >
      <div
        ref={innerRef}
        className={['reveal-below-header__inner', innerClassName].filter(Boolean).join(' ')}
      >
        {children}
      </div>
    </div>
  )

  if (collapseHeader) {
    return (
      <div ref={sectionRef} className={rootClassName} aria-hidden={ariaHidden ?? !isExpanded}>
        {header ? (
          <div className={['reveal-below-header__mask', maskClassName].filter(Boolean).join(' ')}>
            <div className="reveal-below-header__mask-content">{header}</div>
          </div>
        ) : null}
        {panel}
      </div>
    )
  }

  return (
    <div className={rootClassName}>
      {header ? (
        <div className={['reveal-below-header__mask', maskClassName].filter(Boolean).join(' ')}>
          <div className="reveal-below-header__mask-content">{header}</div>
        </div>
      ) : null}
      {panel}
    </div>
  )
}

export default RevealBelowHeaderPanel
