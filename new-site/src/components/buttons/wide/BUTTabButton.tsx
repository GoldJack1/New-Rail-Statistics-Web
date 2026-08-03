'use client'

import React from 'react'
import BUTBaseButton, { type ButtonProps } from '../base/BUTBaseButton/BUTBaseButton'

type BUTTabButtonProps = Omit<ButtonProps, 'variant'>

const BUTTabButton: React.FC<BUTTabButtonProps> = (props) => {
  // Tabs are selection controls — apply onClick immediately so the previous
  // selected tab does not stay visually pressed during the base button delay.
  return <BUTBaseButton {...props} variant="tab" instantAction={props.instantAction ?? true} />
}

export type { BUTTabButtonProps }
export default BUTTabButton
