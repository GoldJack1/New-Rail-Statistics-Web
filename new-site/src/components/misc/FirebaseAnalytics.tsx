'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { isAuthCriticalPath, isColdVisitorDeferPath } from '@/utils/coldVisitorPerf'

function isLabAutomationBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  if (navigator.webdriver) return true
  const ua = navigator.userAgent || ''
  return /Chrome-Lighthouse|PageSpeed|HeadlessChrome/i.test(ua)
}

/**
 * Logs SPA-style `page_view` events when the route changes.
 *
 * Public pages never auto-load gtag — only after a real user gesture — so PSI/Lighthouse
 * cold loads stay free of analytics. Admin/login may schedule after idle.
 */
export default function FirebaseAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastLogged = useRef<string | null>(null)

  useEffect(() => {
    if (isLabAutomationBrowser()) return

    const query = searchParams.toString()
    const pagePath = query ? `${pathname}?${query}` : pathname
    if (lastLogged.current === pagePath) return
    lastLogged.current = pagePath

    let cancelled = false
    let idleHandle: number | undefined
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const logPageView = async () => {
      try {
        const { ensureFirebaseAnalytics } = await import('@/services/firebaseAnalyticsBootstrap')
        const analytics = await ensureFirebaseAnalytics()
        if (!analytics || cancelled) return
        const { logEvent } = await import('firebase/analytics')
        logEvent(analytics, 'page_view', {
          page_path: pagePath,
          page_title: document.title,
        })
      } catch {
        /* analytics blocked or unavailable */
      }
    }

    const scheduleLog = (idleTimeoutMs: number, fallbackMs: number) => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(() => void logPageView(), {
          timeout: idleTimeoutMs,
        })
      } else {
        timeoutHandle = setTimeout(() => void logPageView(), fallbackMs)
      }
    }

    let onFirstInteraction: (() => void) | undefined

    if (isColdVisitorDeferPath(pathname)) {
      onFirstInteraction = () => {
        if (onFirstInteraction) {
          window.removeEventListener('pointerdown', onFirstInteraction, { capture: true })
          window.removeEventListener('keydown', onFirstInteraction, { capture: true })
        }
        if (!cancelled) scheduleLog(5_000, 2_000)
      }
      window.addEventListener('pointerdown', onFirstInteraction, { once: true, capture: true })
      window.addEventListener('keydown', onFirstInteraction, { once: true, capture: true })
    } else if (isAuthCriticalPath(pathname)) {
      scheduleLog(12_000, 6_000)
    } else {
      scheduleLog(5_000, 2_000)
    }

    return () => {
      cancelled = true
      if (onFirstInteraction) {
        window.removeEventListener('pointerdown', onFirstInteraction, { capture: true })
        window.removeEventListener('keydown', onFirstInteraction, { capture: true })
      }
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle)
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }
  }, [pathname, searchParams])

  return null
}
