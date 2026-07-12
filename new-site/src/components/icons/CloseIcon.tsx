'use client'

import { X } from '@phosphor-icons/react'

/** Standard close icon for modal dismiss controls — matches compact chevron button spacing. */
export function CloseIcon({ className }: { className?: string } = {}) {
  return (
    <X
      className={['rs-icon--dismiss', className].filter(Boolean).join(' ')}
      size={16}
      weight="bold"
      aria-hidden
    />
  )
}
