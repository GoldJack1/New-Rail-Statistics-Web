'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { userMustEnrollTotpMfaOnFirebase } from '@/services/firebaseTotpMfa'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Render page content while auth resolves (e.g. stations skeleton) instead of a
   * blocking loader. Redirects still run once auth state is known.
   */
  showShellWhileChecking?: boolean
}

type ProfileCheck = 'idle' | 'checking' | 'ok' | 'need-email-verify' | 'need-totp-enroll'

const isLocalDevLoginBypassEnabled =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_LOCAL_DEV_LOGIN_BYPASS === 'true'

/**
 * Requires a signed-in user with verified email and TOTP (authenticator) MFA enrolled.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  showShellWhileChecking = false,
}) => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [profileCheck, setProfileCheck] = useState<ProfileCheck>('idle')

  useEffect(() => {
    if (isLocalDevLoginBypassEnabled) return
    if (loading) return

    if (!user) {
      setProfileCheck('idle')
      return
    }

    let cancelled = false
    setProfileCheck('checking')

    void (async () => {
      try {
        const firebase = await import('@/services/firebase')
        await firebase.initializeFirebase()
        const auth = await import('firebase/auth')
        const u = firebase.getFirebaseAuth()?.currentUser
        if (cancelled) return
        if (!u) {
          setProfileCheck('need-email-verify')
          return
        }
        try {
          await auth.reload(u)
        } catch {
          /* still check with cached user */
        }
        if (cancelled) return

        if (!u.emailVerified) {
          setProfileCheck('need-email-verify')
          return
        }
        if (userMustEnrollTotpMfaOnFirebase(u)) {
          setProfileCheck('need-totp-enroll')
          return
        }
        setProfileCheck('ok')
      } catch {
        if (!cancelled) setProfileCheck('need-email-verify')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, loading])

  useEffect(() => {
    if (isLocalDevLoginBypassEnabled) return
    if (loading || (user && profileCheck === 'checking')) return

    if (!user) {
      const from = encodeURIComponent(pathname)
      router.replace(`/log-in?from=${from}`)
      return
    }

    if (profileCheck === 'need-email-verify') {
      router.replace('/log-in?reason=verify-email')
      return
    }

    if (profileCheck === 'need-totp-enroll') {
      router.replace('/log-in?reason=enroll-totp')
    }
  }, [user, loading, profileCheck, pathname, router])

  if (isLocalDevLoginBypassEnabled) {
    return <>{children}</>
  }

  const isRedirecting =
    !loading &&
    (!user ||
      profileCheck === 'need-email-verify' ||
      profileCheck === 'need-totp-enroll')

  // Block only while auth state is unknown or a redirect is in flight, unless the route
  // opts into rendering its shell (e.g. stations skeleton) during that window.
  if (!showShellWhileChecking && (loading || isRedirecting)) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          fontSize: '18px',
          color: 'var(--text-secondary)',
        }}
      >
        Loading…
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
