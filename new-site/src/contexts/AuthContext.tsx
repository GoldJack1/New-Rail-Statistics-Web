'use client'

/**
 * Phase 1 placeholder auth context.
 *
 * The Firebase SDK is intentionally NOT initialized anywhere in Phase 1 (see
 * MIGRATION_PLAN.md §5.11) — there is no live authentication yet. This stub
 * preserves the same `useAuth()` shape the old site's components expect
 * (`user`, `loading`, `login`, `loginWithGoogle`, `loginWithApple`, `logout`)
 * so Header/Footer/ProtectedRoute can be ported without modification, while
 * always reporting a signed-out state. Phase 2 will replace this file's
 * internals with the real `src/contexts/AuthContext.tsx` port (Firebase Auth
 * listeners) without needing to touch any consuming component.
 */
import React, { createContext, useContext, useCallback, useMemo } from 'react'

export interface PlaceholderUser {
  uid: string
  email: string | null
  emailVerified: boolean
}

interface AuthContextValue {
  user: PlaceholderUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const login = useCallback(async (email: string) => {
    console.log('[Phase 1 placeholder] login() called — no real auth yet.', { email })
  }, [])

  const loginWithGoogle = useCallback(async () => {
    console.log('[Phase 1 placeholder] loginWithGoogle() called — no real auth yet.')
  }, [])

  const loginWithApple = useCallback(async () => {
    console.log('[Phase 1 placeholder] loginWithApple() called — no real auth yet.')
  }, [])

  const logout = useCallback(async () => {
    console.log('[Phase 1 placeholder] logout() called — no real auth yet.')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user: null, loading: false, login, loginWithGoogle, loginWithApple, logout }),
    [login, loginWithGoogle, loginWithApple, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
