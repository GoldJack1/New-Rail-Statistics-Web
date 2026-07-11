'use client'

import { ChevronLeftIcon } from './ChevronIcons'

/** Standard back chevron for header actions and back buttons. */
export function BackIcon({ className }: { className?: string } = {}) {
  return <ChevronLeftIcon className={className} />
}
