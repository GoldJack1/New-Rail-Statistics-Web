'use client'

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import BUTLink from '../BUTLink'

interface NavLinkProps {
  to: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
  replace?: boolean
  /** @deprecated Next.js App Router has no router-state equivalent; kept for prop compatibility. */
  state?: unknown
}

const NavLink: React.FC<NavLinkProps> = ({
  to,
  children,
  className = '',
  onClick,
  replace = false,
}) => {
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isActive = pathname === to
  const activeClass = isActive ? 'active' : ''
  const pressedClass = isNavigating ? 'pressed' : ''

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isNavigating) {
      return
    }

    if (onClick) {
      onClick()
    }

    setIsNavigating(true)

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
    <BUTLink
      to={to}
      className={`nav-link ${activeClass} ${pressedClass} ${className}`.trim()}
      onClick={handleClick}
    >
      {children}
    </BUTLink>
  )
}

export default NavLink
