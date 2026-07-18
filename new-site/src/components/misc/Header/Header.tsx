'use client'

import React, { useEffect, useId } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { useAppHeaderOffset } from '@/hooks/useAppHeaderOffset'
import { BUTHeaderLink } from '../../buttons'
import BetaTag from '../BetaTag/BetaTag'
import {
  MobileHeaderPanel,
  MobileHeaderTitle,
  MobileHeaderToggle,
  type MobileHeaderNavItem,
} from './MobileHeader'
import './Header.css'

/** Title shown next to the logo on narrow viewports (main nav items stay in the hamburger). */
function getHeaderPageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '/home') return 'Home'
  if (pathname === '/migration') return 'Migration'
  if (pathname === '/log-in') return 'Log in'
  if (pathname === '/privacy') return 'Privacy Policy'
  if (pathname === '/eula') return 'EULA'
  if (pathname === '/buttons') return 'Buttons'
  if (pathname.startsWith('/admin/stations/new')) return 'New station'
  if (pathname.startsWith('/admin/stations/pending-review')) return 'Pending review'
  if (pathname === '/stations/map') return 'Map'
  if (pathname.startsWith('/stations/')) return 'Station'
  if (pathname === '/stations') return 'Stations'
  if (pathname.startsWith('/admin/design-system/colours')) return 'Colours'
  if (pathname.startsWith('/admin/design-system/typography')) return 'Typography'
  if (pathname.startsWith('/admin/design-system/buttons')) return 'Buttons'
  if (pathname.startsWith('/admin/design-system/layout')) return 'Layout'
  if (pathname.startsWith('/admin/design-system/components')) return 'Components'
  if (pathname.startsWith('/admin/design-system/icons')) return 'Icons'
  if (pathname.startsWith('/admin/design-system/heros')) return 'Heros'
  if (pathname.startsWith('/admin/design-system')) return 'Design system'
  if (pathname.startsWith('/admin/stations')) return 'Stations'
  if (pathname.startsWith('/admin/messages')) return 'Messages'
  if (pathname.startsWith('/units')) return 'Units'
  if (pathname.startsWith('/admin/api-status')) return 'API Status'
  return 'Rail Statistics'
}

const Header: React.FC = () => {
  const { user } = useAuth()
  const pathname = usePathname() ?? '/'
  const mobileNavId = useId()
  /** Don’t stack “log-in → migration” in history, or browser Back from migration returns to login. */
  const logoNavReplace = pathname === '/log-in'

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const headerRef = useAppHeaderOffset<HTMLElement>(mobileMenuOpen)

  const isHomeActive = pathname === '/' || pathname === '/home'
  const isMigrationActive = pathname === '/migration'
  const isStationsActive = pathname === '/stations' || pathname.startsWith('/admin/stations')
  const isMapActive = pathname === '/stations/map'
  const isMessagesActive = pathname.startsWith('/admin/messages')

  const pageTitle = getHeaderPageTitle(pathname)

  const navItems: MobileHeaderNavItem[] = [
    { to: '/' as const, label: 'Home', active: isHomeActive, showBeta: false },
    { to: '/migration' as const, label: 'Migration', active: isMigrationActive, showBeta: false },
    { to: '/stations' as const, label: 'Stations', active: isStationsActive && !isMapActive, showBeta: false },
    { to: '/stations/map' as const, label: 'Map', active: isMapActive, showBeta: true },
    { to: '/admin/messages' as const, label: 'Messages', active: isMessagesActive, showBeta: false },
  ].filter((item) => {
    if (item.to === '/admin/messages') return Boolean(user)
    return true
  })

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header
      ref={headerRef}
      className={`universal-header${mobileMenuOpen ? ' universal-header--menu-open' : ''}`}
    >
      {/*
        iOS Safari (esp. 26+ “Liquid Glass”): in-tab chrome tint is derived from fixed
        elements with a solid background-color near the top — not theme-color. A plain strip
        under the real header avoids backdrop-filter sampling a black/wrong tone.
        https://github.com/andesco/safari-color-tinting
      */}
      <div className="safari-toolbar-tint" aria-hidden="true" />
      <div className="header-inner">
        <div className="header-container">
          <div className="header-left">
            <BUTHeaderLink
              to="/"
              replace={logoNavReplace}
              className="logo-link logo-link--full"
              ariaLabel="Rail Statistics home"
            >
              <div className="logo">
                <span className="logo-text">Rail Statistics</span>
              </div>
            </BUTHeaderLink>
            <MobileHeaderTitle
              pageTitle={pageTitle}
              showBeta={isMapActive}
              logoNavReplace={logoNavReplace}
            />
          </div>

          <div className="header-right">
            <nav className="header-nav header-nav--desktop" aria-label="Main">
              <div className="header-nav-links">
                {navItems.map(({ to, label, active, showBeta }) => (
                  <BUTHeaderLink key={to} to={to} active={active}>
                    <span className="header-nav-link__label">{label}</span>
                    {showBeta ? <BetaTag /> : null}
                  </BUTHeaderLink>
                ))}
              </div>
            </nav>
            <MobileHeaderToggle
              menuOpen={mobileMenuOpen}
              navId={mobileNavId}
              onMenuOpenChange={setMobileMenuOpen}
            />
          </div>
        </div>

        <MobileHeaderPanel
          menuOpen={mobileMenuOpen}
          navId={mobileNavId}
          navItems={navItems}
          onClose={closeMobileMenu}
        />
      </div>
    </header>
  )
}

export default Header
