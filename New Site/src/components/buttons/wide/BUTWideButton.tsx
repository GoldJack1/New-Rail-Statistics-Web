'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import BUTBaseButton, { type ButtonProps } from '../base/BUTBaseButton/BUTBaseButton'

type BUTWideButtonProps = Omit<ButtonProps, 'variant'> & {
  to?: string
  replace?: boolean
  /** @deprecated Next.js App Router has no router-state equivalent; kept for prop compatibility. */
  navigationState?: unknown
  onNavigate?: () => void
  isActive?: boolean
}

const BUTWideButton: React.FC<BUTWideButtonProps> = ({
  to,
  replace = false,
  onNavigate,
  isActive = false,
  onClick,
  pressed,
  disabled,
  ...props
}) => {
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  const handleNavigateClick = () => {
    if (!to || disabled || isNavigating) return
    setIsNavigating(true)
    onNavigate?.()
    setTimeout(() => {
      if (replace) {
        router.replace(to)
      } else {
        router.push(to)
      }
      setIsNavigating(false)
    }, 300)
  }

  return (
    <BUTBaseButton
      {...props}
      variant="wide"
      onClick={to ? () => handleNavigateClick() : onClick}
      pressed={pressed || isActive || isNavigating}
      disabled={disabled || isNavigating}
    />
  )
}

export type { BUTWideButtonProps }
export default BUTWideButton
