'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRightIcon } from '@/components/icons'
import './TextCard.css'

export type TextCardState = 'default' | 'accent' | 'redAction' | 'greenAction'

export interface TextCardProps {
  title: string
  description: string
  state?: TextCardState
  to?: string
  onClick?: () => void
  trailingIcon?: React.ReactNode
  disabled?: boolean
  pressed?: boolean
  className?: string
  ariaLabel?: string
}

const DefaultChevron: React.FC = () => (
  <ChevronRightIcon className="rs-text-card__chevron-svg" />
)

const TextCard: React.FC<TextCardProps> = ({
  title,
  description,
  state = 'default',
  to,
  onClick,
  trailingIcon,
  disabled = false,
  pressed = false,
  className = '',
  ariaLabel
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const releaseTimerRef = useRef<number | null>(null)

  const clearReleaseTimer = () => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current)
      releaseTimerRef.current = null
    }
  }

  const scheduleRelease = () => {
    clearReleaseTimer()
    releaseTimerRef.current = window.setTimeout(() => {
      setIsPressed(false)
      releaseTimerRef.current = null
    }, 300)
  }

  const handlePressStart = () => {
    if (disabled) return
    clearReleaseTimer()
    setIsPressed(true)
  }

  const handlePressEnd = () => {
    if (disabled) return
    scheduleRelease()
  }

  const handleClick = () => {
    if (disabled) return
    onClick?.()
  }

  useEffect(() => () => clearReleaseTimer(), [])

  const actualPressed = !disabled && (pressed || isPressed)
  const classes = [
    'rs-text-card',
    `rs-text-card--state-${state}`,
    actualPressed ? 'rs-text-card--pressed' : 'rs-text-card--active',
    disabled ? 'rs-text-card--disabled' : '',
    className
  ].filter(Boolean).join(' ')

  const content = (
    <>
      <span className="rs-text-card__content">
        <span className="rs-text-card__title">{title}</span>
        <span className="rs-text-card__description">{description}</span>
      </span>
      <span className="rs-text-card__chevron">{trailingIcon ?? <DefaultChevron />}</span>
      <span className="rs-text-card__inner-shadow" aria-hidden="true" />
    </>
  )

  const pressHandlers = {
    onPointerDown: handlePressStart,
    onPointerUp: handlePressEnd,
    onPointerLeave: handlePressEnd,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') handlePressStart()
    },
    onKeyUp: (event: React.KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') handlePressEnd()
    },
  }

  if (to && !disabled) {
    return (
      <Link
        href={to}
        className={classes}
        aria-label={ariaLabel ?? title}
        {...pressHandlers}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      {...pressHandlers}
      onClick={handleClick}
      aria-label={ariaLabel ?? title}
    >
      {content}
    </button>
  )
}

export default TextCard
