'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, X } from '@phosphor-icons/react'
import { ANDROID_APP_URL, IOS_APP_URL } from '@/utils/appDownload'
import { BUTBaseButton as Button } from '../../buttons'
import { BUTSharedNativeButton } from '../../buttons'
import './HomeDownloadPlatformModal.css'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  if (!open || !mounted) return null

  return createPortal(
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
                window.location.href = IOS_APP_URL
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
              onClick={() => copyLink(IOS_APP_URL)}
              icon={getCopyIcon(copiedUrl === IOS_APP_URL)}
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
                window.location.href = ANDROID_APP_URL
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
              onClick={() => copyLink(ANDROID_APP_URL)}
              icon={getCopyIcon(copiedUrl === ANDROID_APP_URL)}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default HomeDownloadPlatformModal
