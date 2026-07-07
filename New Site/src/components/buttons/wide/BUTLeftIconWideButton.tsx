'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import BUTBaseButton, { type ButtonProps } from '../base/BUTBaseButton/BUTBaseButton'

type BUTLeftIconWideButtonProps = Omit<ButtonProps, 'variant' | 'iconPosition'> & {
  to?: string
  replace?: boolean
  /** @deprecated Next.js App Router has no router-state equivalent; kept for prop compatibility. */
  navigationState?: unknown
  onNavigate?: () => void
}

const BUTLeftIconWideButton: React.FC<BUTLeftIconWideButtonProps> = ({
  to,
  replace = false,
  onNavigate,
  onClick,
  disabled,
  ...props
}) => {
  const router = useRouter()

  const handleNavigateClick = () => {
    if (!to || disabled) return
    onNavigate?.()
    setTimeout(() => {
      if (replace) {
        router.replace(to)
      } else {
        router.push(to)
      }
    }, 300)
  }

  return (
    <BUTBaseButton
      {...props}
      variant="wide"
      iconPosition="left"
      disabled={disabled}
      onClick={to ? () => handleNavigateClick() : onClick}
    />
  )
}

export type { BUTLeftIconWideButtonProps }
export default BUTLeftIconWideButton
