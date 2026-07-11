'use client'

import type { ReactNode } from 'react'
import { IconContext, type IconProps } from '@phosphor-icons/react'

const DEFAULT_ICON_CONTEXT: IconProps = {
  size: 16,
  weight: 'regular',
  mirrored: false,
  'aria-hidden': true,
}

export function PhosphorIconProvider({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider value={DEFAULT_ICON_CONTEXT}>
      {children}
    </IconContext.Provider>
  )
}
