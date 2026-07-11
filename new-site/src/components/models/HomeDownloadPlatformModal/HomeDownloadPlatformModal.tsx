'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Check, Copy, X } from '@phosphor-icons/react'
import { BUTBaseButton as Button } from '../../buttons'
import { BUTSharedNativeButton } from '../../buttons'
import './HomeDownloadPlatformModal.css'

const IOS_URL = 'https://apps.apple.com/gb/app/rail-statistics/id6759503043'
const ANDROID_URL =
  'https://play.google.com/store/apps/details?id=com.jw.railstatisticsandroid.beta&pli=1'

export interface HomeDownloadPlatformModalProps {
  open: boolean
  onClose: () => void
}

const getCopyIcon = (isCopied: boolean) => (
  <span className="rs-download-platform-modal__copy-icon-stack" aria-hidden="true">
    <Copy
      className={['rs-download-platform-modal__copy-icon', !isCopied && 'is-visible'].filter(Boolean).join(' ')}
      size={16}
      weight="regular"
      aria-hidden
    />
    <Check
      className={['rs-download-platform-modal__copy-icon', isCopied && 'is-visible'].filter(Boolean).join(' ')}
      size={16}
      weight="bold"
      aria-hidden
    />
  </span>
)

/** Desktop “choose platform” dialog for the home download CTA. */
const HomeDownloadPlatformModal: React.FC<HomeDownloadPlatformModalProps> = ({ open, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const copyLink = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="rs-download-platform-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Download Rail Statistics"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="rs-download-platform-modal">
        <BUTSharedNativeButton type="button" className="rs-download-platform-modal__close" aria-label="Close" onClick={onClose}>
          <X size={16} weight="bold" aria-hidden />
        </BUTSharedNativeButton>
        <h2 className="rs-download-platform-modal__title">Download Rail Statistics</h2>
        <p className="rs-download-platform-modal__subtitle">Choose your platform</p>
        <div className="rs-download-platform-modal__buttons">
          <div className="rs-download-platform-modal__row">
            <Button
              variant="wide"
              shape="rounded"
              width="fill"
              colorVariant="accent"
              type="button"
              onClick={() => {
                window.location.href = IOS_URL
              }}
            >
              Download on iOS
            </Button>
            <Button
              variant="circle"
              shape="rounded"
              type="button"
              colorVariant="secondary"
              ariaLabel="Copy iOS link"
              onClick={() => copyLink(IOS_URL)}
              icon={getCopyIcon(copiedUrl === IOS_URL)}
            />
          </div>
          <div className="rs-download-platform-modal__row">
            <Button
              variant="wide"
              shape="rounded"
              width="fill"
              colorVariant="accent"
              type="button"
              onClick={() => {
                window.location.href = ANDROID_URL
              }}
            >
              Download on Android
            </Button>
            <Button
              variant="circle"
              shape="rounded"
              type="button"
              colorVariant="secondary"
              ariaLabel="Copy Android link"
              onClick={() => copyLink(ANDROID_URL)}
              icon={getCopyIcon(copiedUrl === ANDROID_URL)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeDownloadPlatformModal
