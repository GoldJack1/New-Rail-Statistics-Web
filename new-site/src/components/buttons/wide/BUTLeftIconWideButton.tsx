'use client'

import React from 'react'
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
  const handleClick: ButtonProps['onClick'] = (event) => {
    onNavigate?.()
    onClick?.(event)
  }

  return (
    <BUTBaseButton
      {...props}
      variant="wide"
      iconPosition="left"
      to={to}
      replace={replace}
      disabled={disabled}
      onClick={to ? handleClick : onClick}
    />
  )
}

export type { BUTLeftIconWideButtonProps }
export default BUTLeftIconWideButton
