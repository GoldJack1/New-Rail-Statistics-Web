'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
              <svg className="site-footer-theme-toggle__icon site-footer-theme-toggle__icon--sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <svg className="site-footer-theme-toggle__icon site-footer-theme-toggle__icon--moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
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
