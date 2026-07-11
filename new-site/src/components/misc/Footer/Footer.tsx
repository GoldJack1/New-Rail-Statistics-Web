'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import { useAuth } from '../../../contexts/AuthContext'
import { useTheme } from '../../../hooks/useTheme'
import {
  isStationAdminModeActive,
  isStationAdminSearchParam,
  writeStationAdminModeEnabled,
} from '../../../utils/stationAdminModeStorage'
import { BUTFooterLink } from '../../buttons'
import './Footer.css'

const Footer: React.FC = () => {
  const { user, logout } = useAuth()
  const { toggleTheme } = useTheme()
  const pathname = usePathname() ?? '/'
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''
  const router = useRouter()
  const isStationsPage = pathname.startsWith('/admin/stations')

  useEffect(() => {
    if (user && isStationAdminSearchParam(search)) {
      writeStationAdminModeEnabled(true)
    }
  }, [user, search])

  const handleAdminToggle = () => {
    const currentlyOn = isStationAdminModeActive(search)
    const nextOn = !currentlyOn
    writeStationAdminModeEnabled(nextOn)

    if (pathname === '/stations/map') {
      const params = new URLSearchParams(search)
      if (nextOn) {
        params.set('admin', '1')
      } else {
        params.delete('admin')
      }
      const query = params.toString()
      router.push(query.length > 0 ? `/stations/map?${query}` : '/stations/map')
      return
    }

    if (isStationsPage) {
      const params = new URLSearchParams(search)
      if (nextOn) {
        params.set('admin', '1')
      } else {
        params.delete('admin')
      }
      const query = params.toString()
      router.push(query.length > 0 ? `/admin/stations?${query}` : '/admin/stations')
      return
    }

    router.push(nextOn ? '/admin/stations?admin=1' : '/admin/stations')
  }

  return (
    <footer className="site-footer app-footer">
      <div className="site-footer-inner">
        <div className="site-footer-primary-row">
          <p>&copy; {new Date().getFullYear()} Rail Statistics</p>
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
              <BUTFooterLink onActivate={handleAdminToggle}>
                Admin
              </BUTFooterLink>
            </div>
          </div>
        ) : null}
      </div>
    </footer>
  )
}

export default Footer
