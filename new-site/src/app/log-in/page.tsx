'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { BUTWideButton } from '@/components/buttons'
import TXTINPWideButton from '@/components/textInputs/plain/TXTINPWideButton'
import './LoginPage.css'

/**
 * Phase 1 UI shell only (MIGRATION_PLAN.md §5.11): matches the old site's
 * `LoginPage.tsx` credentials-step visual structure, but the submit handler
 * is a no-op/console-log — no Firebase Auth, email verification, or TOTP MFA
 * enrollment/challenge flow is wired up yet. That full state machine (and its
 * `verify-email` / `totp-signin` / `totp-enroll` steps) is a Phase 2 item.
 */
export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Log in</h1>
        <p className="login-subtitle">Sign in with email and password.</p>
        <p className="login-info-banner" role="status">
          Phase 1 preview — this form does not sign you in yet (no live authentication).
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-email" className="login-label login-label--credentials">
              Email
            </label>
            <TXTINPWideButton
              id="login-email"
              type="email"
              value={email}
              onInputChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              colorVariant="secondary"
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password" className="login-label login-label--credentials">
              Password
            </label>
            <TXTINPWideButton
              id="login-password"
              type="password"
              value={password}
              onInputChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              minLength={6}
              colorVariant="secondary"
            />
          </div>
          <BUTWideButton
            type="submit"
            width="fill"
            className="login-submit"
            colorVariant="accent"
            disabled={submitting || email.trim().length === 0 || password.length === 0}
          >
            {submitting ? 'Please wait…' : 'Log in'}
          </BUTWideButton>
        </form>
      </div>
    </div>
  )
}
