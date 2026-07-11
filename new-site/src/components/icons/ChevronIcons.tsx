'use client'

import { CaretDown, CaretLeft, CaretRight, CaretUp } from '@phosphor-icons/react'

type ChevronIconProps = {
  className?: string
  size?: number
}

/** Phosphor chevron for navigation / disclosure controls in buttons and cards. */
export function ChevronLeftIcon({ className, size = 16 }: ChevronIconProps) {
  return (
    <CaretLeft
      className={['rs-icon--chevron', className].filter(Boolean).join(' ')}
      size={size}
      weight="bold"
      aria-hidden
    />
  )
}

export function ChevronRightIcon({ className, size = 16 }: ChevronIconProps) {
  return (
    <CaretRight
      className={['rs-icon--chevron', className].filter(Boolean).join(' ')}
      size={size}
      weight="bold"
      aria-hidden
    />
  )
}

export function ChevronDownIcon({ className, size = 16 }: ChevronIconProps) {
  return (
    <CaretDown
      className={['rs-icon--chevron', className].filter(Boolean).join(' ')}
      size={size}
      weight="bold"
      aria-hidden
    />
  )
}

export function ChevronUpIcon({ className, size = 16 }: ChevronIconProps) {
  return (
    <CaretUp
      className={['rs-icon--chevron', className].filter(Boolean).join(' ')}
      size={size}
      weight="bold"
      aria-hidden
    />
  )
}
