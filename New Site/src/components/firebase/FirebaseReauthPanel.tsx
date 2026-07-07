'use client'

/**
 * Phase 1 visual shell only (per MIGRATION_PLAN.md §5.4 "firebase/ — placeholders
 * only"). The real component (old site's `src/components/firebase/FirebaseReauthPanel.tsx`)
 * re-authenticates against Firebase Auth (password + optional TOTP MFA resolver).
 * That logic is Phase 2 — this keeps the same markup/classNames/props shape so
 * callers and CSS port unchanged, but the submit handler is a no-op.
 */
import React, { useState } from 'react'
import { BUTBaseButton as Button } from '../buttons'
import TXTINPWideButton from '../textInputs/plain/TXTINPWideButton'

export interface PlaceholderReauthUser {
  email?: string | null
}

export type FirebaseReauthLayout = 'phased' | 'stacked'

export interface FirebaseReauthPanelProps {
  user: PlaceholderReauthUser
  onVerified: () => void
  onCancel: () => void
  title?: string
  titleHeading?: 'h2' | 'h3'
  layout?: FirebaseReauthLayout
}

const FirebaseReauthPanel: React.FC<FirebaseReauthPanelProps> = ({
  user,
  onVerified,
  onCancel,
  title = 'Confirm it\u2019s you',
  titleHeading = 'h2',
}) => {
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const TitleTag = titleHeading

  return (
    <form
      className="firebase-reauth-panel firebase-reauth-panel--stacked"
      onSubmit={(e) => {
        e.preventDefault()
        console.log('[Phase 1 placeholder] FirebaseReauthPanel verify — no real auth yet.', {
          email: user.email,
        })
        onVerified()
      }}
    >
      <TitleTag id="firebase-reauth-title" className="password-reauth-title">
        {title}
      </TitleTag>
      <p className="password-reauth-intro">
        Enter your <strong>password</strong> and <strong>authenticator code</strong>, then tap{' '}
        <strong>Verify</strong>. (Phase 1 placeholder — no real verification yet.)
      </p>
      <label className="password-reauth-label" htmlFor="firebase-reauth-password-stacked">
        Password
      </label>
      <TXTINPWideButton
        id="firebase-reauth-password-stacked"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Password"
      />
      <label className="password-reauth-label" htmlFor="firebase-reauth-totp-stacked">
        Authenticator code (if enabled)
      </label>
      <TXTINPWideButton
        id="firebase-reauth-totp-stacked"
        type="text"
        inputMode="numeric"
        value={totpCode}
        onChange={setTotpCode}
        placeholder="123456"
      />
      <div className="password-reauth-actions">
        <Button type="button" variant="wide" colorVariant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="wide" colorVariant="primary">
          Verify
        </Button>
      </div>
    </form>
  )
}

export default FirebaseReauthPanel
