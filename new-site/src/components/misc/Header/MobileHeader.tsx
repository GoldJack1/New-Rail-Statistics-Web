'use client'

import React from 'react'
import { List, X } from '@phosphor-icons/react'
import { BUTHeaderLink } from '../../buttons'
import BetaTag from '../BetaTag/BetaTag'
import './MobileHeader.css'

export type MobileHeaderNavItem = {
  to: string
  label: string
  active: boolean
  showBeta?: boolean
}

type MobileHeaderMenuProps = {
  menuOpen: boolean
  className?: string
  children: React.ReactNode
}

/** Wrapper that owns the open modifier class for toggle + panel animation. */
export function MobileHeaderMenu({ menuOpen, className = '', children }: MobileHeaderMenuProps) {
  return (
    <div
      className={[
        'mobile-header-menu',
        menuOpen ? 'mobile-header-menu--open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

type MobileHeaderTitleProps = {
  pageTitle: string
  showBeta?: boolean
  logoNavReplace?: boolean
}

export function MobileHeaderTitle({
  pageTitle,
  showBeta = false,
  logoNavReplace = false,
}: MobileHeaderTitleProps) {
  return (
    <div className="logo logo--mobile">
      <BUTHeaderLink
        to="/"
        replace={logoNavReplace}
        className="logo-link logo-link--mobile-title"
        ariaLabel="Rail Statistics home"
      >
        <span className="header-page-title-row">
          <span className="header-page-title">{pageTitle}</span>
          {showBeta ? <BetaTag className="header-page-title__beta" /> : null}
        </span>
      </BUTHeaderLink>
    </div>
  )
}

type MobileHeaderToggleProps = {
  menuOpen: boolean
  navId: string
  onMenuOpenChange: (open: boolean) => void
  ariaLabelOpen?: string
  ariaLabelClose?: string
}

export function MobileHeaderToggle({
  menuOpen,
  navId,
  onMenuOpenChange,
  ariaLabelOpen = 'Open menu',
  ariaLabelClose = 'Close menu',
}: MobileHeaderToggleProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onMenuOpenChange(!menuOpen)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="header-menu-toggle"
      aria-expanded={menuOpen}
      aria-controls={navId}
      aria-label={menuOpen ? ariaLabelClose : ariaLabelOpen}
      onClick={() => onMenuOpenChange(!menuOpen)}
      onKeyDown={handleKeyDown}
    >
      <span className="header-menu-toggle__icon" aria-hidden>
        <List className="header-menu-toggle__glyph header-menu-toggle__glyph--list" size={20} weight="bold" />
        <X className="header-menu-toggle__glyph header-menu-toggle__glyph--close" size={20} weight="bold" />
      </span>
    </div>
  )
}

type MobileHeaderPanelProps = {
  menuOpen: boolean
  navId: string
  onClose?: () => void
  navItems?: MobileHeaderNavItem[]
  children?: React.ReactNode
  ariaLabel?: string
  className?: string
}

export function MobileHeaderPanel({
  menuOpen,
  navId,
  onClose,
  navItems,
  children,
  ariaLabel = 'Main',
  className = '',
}: MobileHeaderPanelProps) {
  return (
    <div
      className={['header-mobile-panel', className].filter(Boolean).join(' ')}
      id={navId}
      aria-hidden={!menuOpen}
    >
      <div className="header-mobile-panel-inner" inert={menuOpen ? undefined : true}>
        {children ?? (
          <nav className="header-nav header-nav--mobile" aria-label={ariaLabel}>
            <ul className="header-mobile-nav-list">
              {(navItems ?? []).map(({ to, label, active, showBeta }) => (
                <li key={to}>
                  <BUTHeaderLink to={to} active={active} onClick={onClose}>
                    <span className="header-nav-link__label">{label}</span>
                    {showBeta ? <BetaTag /> : null}
                  </BUTHeaderLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}
