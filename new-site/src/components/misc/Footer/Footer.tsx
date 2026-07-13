'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import { useAuth } from '../../../contexts/AuthContext'
import { useStationAdminMode } from '../../../hooks/useStationAdminMode'
import { useTheme } from '../../../hooks/useTheme'
import {
  isStationAdminSearchParam,
  writeStationAdminModeEnabled,
} from '../../../utils/stationAdminModeStorage'
import { BUTFooterLink, TOGToggleVisited } from '../../buttons'
import './Footer.css'

const Footer: React.FC = () => {
  const { user, logout } = useAuth()
  const { toggleTheme } = useTheme()
  const pathname = usePathname() ?? '/'
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''
  const router = useRouter()
  const adminModeActive = useStationAdminMode()
  const syncAdminSearchParam =
    pathname === '/stations/map' || pathname === '/admin/stations' || pathname === '/admin/map'

  useEffect(() => {
    if (user && isStationAdminSearchParam(search)) {
      writeStationAdminModeEnabled(true)
    }
  }, [user, search])

  const handleAdminModeChange = (nextOn: boolean) => {
    writeStationAdminModeEnabled(nextOn)

    if (!syncAdminSearchParam) return

    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (nextOn) {
      params.set('admin', '1')
    } else {
      params.delete('admin')
    }
    const query = params.toString()
    router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <footer className="site-footer app-footer">
      <div className="site-footer-inner">
        <div className="site-footer-primary-row">
          <div className="site-footer-brand">
            <p>&copy; {new Date().getFullYear()} Rail Statistics</p>
          </div>
          <div className="site-footer-links site-footer-links--base-row">
            <BUTFooterLink to="/">
              Home
            </BUTFooterLink>
            <BUTFooterLink to="/migration">
              Migration
            </BUTFooterLink>
            <BUTFooterLink to="/privacy">
              Privacy Policy
            </BUTFooterLink>
            <BUTFooterLink to="/eula">
              EULA
            </BUTFooterLink>
            {user ? (
              <BUTFooterLink onActivate={logout} className="site-footer-logout">
                Log out
              </BUTFooterLink>
            ) : (
              <BUTFooterLink to="/log-in">
                Log in
              </BUTFooterLink>
            )}
            <BUTFooterLink onActivate={toggleTheme} className="site-footer-theme-toggle" ariaLabel="Toggle theme">
              <span className="site-footer-theme-toggle__icon site-footer-theme-toggle__icon--sun" aria-hidden>
                <Sun className="site-footer-theme-toggle__glyph site-footer-theme-toggle__glyph--bold" size={16} weight="bold" />
                <Sun className="site-footer-theme-toggle__glyph site-footer-theme-toggle__glyph--fill" size={16} weight="fill" />
              </span>
              <span className="site-footer-theme-toggle__icon site-footer-theme-toggle__icon--moon" aria-hidden>
                <Moon className="site-footer-theme-toggle__glyph site-footer-theme-toggle__glyph--bold" size={16} weight="bold" />
                <Moon className="site-footer-theme-toggle__glyph site-footer-theme-toggle__glyph--fill" size={16} weight="fill" />
              </span>
            </BUTFooterLink>
          </div>
        </div>
        {user ? (
          <div className="site-footer-secondary-row">
            <div className="site-footer-admin-toggle">
              <span className="site-footer-admin-toggle__label">Admin</span>
              <TOGToggleVisited
                checked={adminModeActive}
                onChange={handleAdminModeChange}
                ariaLabel="Admin mode"
                className="site-footer-admin-toggle__control"
              />
            </div>
            <div className="site-footer-links site-footer-links--logged-in-row">
              <BUTFooterLink to="/admin/stations">
                Stations
              </BUTFooterLink>
              <BUTFooterLink to="/admin/api-status">
                API Status
              </BUTFooterLink>
              <BUTFooterLink to="/admin/design-system">
                Design System
              </BUTFooterLink>
            </div>
          </div>
        ) : null}
      </div>
    </footer>
  )
}

export default Footer
