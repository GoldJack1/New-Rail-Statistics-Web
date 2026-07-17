'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import type { User } from 'firebase/auth'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_SESSION_HINT_KEY = 'rs-auth-session-hint'

function readAuthSessionHint(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

function writeAuthSessionHint(active: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (active) {
      window.localStorage.setItem(AUTH_SESSION_HINT_KEY, '1')
    } else {
      window.localStorage.removeItem(AUTH_SESSION_HINT_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

function isMarketingHomePath(pathname: string): boolean {
  return pathname === '/' || pathname === '/home'
}

function isColdVisitorAuthDeferPath(pathname: string): boolean {
  return isMarketingHomePath(pathname)
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname() ?? '/'

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    let idleHandle: number | undefined
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    let onFirstInteraction: (() => void) | undefined

    const authIsRouteCritical =
      pathname === '/log-in' ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/stations')

    const init = async (options?: { deferAppCheck?: boolean }) => {
      const firebase = await import('@/services/firebase')
      await firebase.initializeFirebase()
      if (authIsRouteCritical) {
        if (options?.deferAppCheck) {
          // Restore auth session first so the page can paint; load reCAPTCHA after idle.
          const scheduleAppCheck = () => {
            void firebase.ensureFirebaseAppCheck()
          }
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(scheduleAppCheck, { timeout: 4_000 })
          } else {
            window.setTimeout(scheduleAppCheck, 1_500)
          }
        } else {
          await firebase.ensureFirebaseAppCheck()
        }
      }
      await firebase.tryDevAutoSignInFromEnv()
      if (cancelled) return

      const auth = firebase.getFirebaseAuth()
      if (auth) {
        try {
          const result = await firebase.handleRedirectResult()
          if (result?.user) {
            setUser(result.user)
            setLoading(false)
          }
        } catch (err) {
          console.warn('Redirect result error:', err)
        }
        if (cancelled) return
        unsubscribe = firebase.onAuthStateChanged(auth, (u) => {
          setUser(u)
          writeAuthSessionHint(Boolean(u))
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }

    const scheduleDeferredInit = (fallbackMs: number) => {
      const run = () => {
        if (onFirstInteraction) {
          window.removeEventListener('pointerdown', onFirstInteraction, { capture: true })
          window.removeEventListener('keydown', onFirstInteraction, { capture: true })
        }
        if (!cancelled) void init()
      }
      onFirstInteraction = run
      window.addEventListener('pointerdown', onFirstInteraction, { once: true, capture: true })
      window.addEventListener('keydown', onFirstInteraction, { once: true, capture: true })
      timeoutHandle = setTimeout(run, fallbackMs)
    }

    if (authIsRouteCritical) {
      // Returning visitors already have a session hint — defer ~400 KiB reCAPTCHA past first paint.
      // Fresh / login flows still load App Check before interacting with Auth.
      void init({ deferAppCheck: readAuthSessionHint() && pathname !== '/log-in' })
    } else if (isColdVisitorAuthDeferPath(pathname) && !readAuthSessionHint()) {
      // Cold marketing visits: skip Firebase Auth (and its iframe.js) until the user navigates away
      // or signs in on another route. PSI / first-time visitors won't download the auth iframe.
      setLoading(false)
    } else if (isColdVisitorAuthDeferPath(pathname)) {
      scheduleDeferredInit(12_000)
    } else if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(() => void init(), { timeout: 5_000 })
    } else {
      timeoutHandle = setTimeout(() => void init(), 3_000)
    }

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
      if (onFirstInteraction) {
        window.removeEventListener('pointerdown', onFirstInteraction, { capture: true })
        window.removeEventListener('keydown', onFirstInteraction, { capture: true })
      }
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle)
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }
  }, [pathname])

  const login = useCallback(async (email: string, password: string) => {
    const firebase = await import('@/services/firebase')
    await firebase.initializeFirebase()
    await firebase.loginWithEmail(email, password)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    const firebase = await import('@/services/firebase')
    await firebase.loginWithGoogle()
  }, [])

  const loginWithApple = useCallback(async () => {
    const firebase = await import('@/services/firebase')
    await firebase.loginWithApple()
  }, [])

  const logout = useCallback(async () => {
    const firebase = await import('@/services/firebase')
    await firebase.initializeFirebase()
    await firebase.logout()
    writeAuthSessionHint(false)
  }, [])

  const value: AuthContextValue = { user, loading, login, loginWithGoogle, loginWithApple, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
