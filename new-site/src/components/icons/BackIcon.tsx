'use client'

import { ArrowLeft } from '@phosphor-icons/react'

/** Standard back control icon for PageTopHeader actions */
export function BackIcon({ className = 'rs-page-top-header__action-icon' }: { className?: string }) {
  return <ArrowLeft className={className} size={16} weight="bold" aria-hidden />
}
