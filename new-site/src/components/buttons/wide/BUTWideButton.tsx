'use client'

import React from 'react'
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
  const handleClick: ButtonProps['onClick'] = (event) => {
    onNavigate?.()
    onClick?.(event)
  }

  return (
    <BUTBaseButton
      {...props}
      variant="wide"
      to={to}
      replace={replace}
      onClick={to ? handleClick : onClick}
      pressed={pressed || isActive}
      disabled={disabled}
    />
  )
}

export type { BUTWideButtonProps }
export default BUTWideButton
