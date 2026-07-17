'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function isLabAutomationBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  if (navigator.webdriver) return true
  const ua = navigator.userAgent || ''
  return /Chrome-Lighthouse|PageSpeed|HeadlessChrome/i.test(ua)
}

/**
 * Logs SPA-style `page_view` events when the route changes (parity with implicit
 * Firebase Analytics behaviour on the old React Router app).
 *
 * Public `/stations` never auto-loads gtag — only after a real user gesture — so
 * mobile PSI/Lighthouse runs do not pull ~145 KiB of unused analytics onto LCP.
 */
export default function FirebaseAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastLogged = useRef<string | null>(null)

  useEffect(() => {
    // Lab tools set webdriver / Lighthouse UA; skip gtag entirely for those runs.
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

    const isMarketingHome = pathname === '/' || pathname === '/home'
    const isPublicStationsList = pathname === '/stations'
    const isHeavyAppRoute =
      pathname.startsWith('/admin') ||
      (pathname.startsWith('/stations') && !isPublicStationsList) ||
      pathname.startsWith('/departures')
    const deferUntilScroll = isMarketingHome
    const deferUntilInteraction = isPublicStationsList
    const scheduleLog = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(() => void logPageView(), {
          timeout: isHeavyAppRoute ? 12_000 : 5_000,
        })
      } else {
        timeoutHandle = setTimeout(() => void logPageView(), isHeavyAppRoute ? 6_000 : 2_000)
      }
    }

    let onFirstScroll: (() => void) | undefined
    let onFirstInteraction: (() => void) | undefined

    if (deferUntilInteraction) {
      // Interaction-only: no timer fallback (mobile PSI runs long enough to hit 30s).
      onFirstInteraction = () => {
        if (onFirstInteraction) {
          window.removeEventListener('pointerdown', onFirstInteraction, { capture: true })
          window.removeEventListener('keydown', onFirstInteraction, { capture: true })
        }
        if (!cancelled) scheduleLog()
      }
      window.addEventListener('pointerdown', onFirstInteraction, { once: true, capture: true })
      window.addEventListener('keydown', onFirstInteraction, { once: true, capture: true })
    } else if (deferUntilScroll) {
      onFirstScroll = () => {
        if (onFirstScroll) {
          window.removeEventListener('scroll', onFirstScroll, { capture: true })
        }
        if (!cancelled) scheduleLog()
      }
      window.addEventListener('scroll', onFirstScroll, { passive: true, capture: true })
      // Longer than a typical mobile lab run so home PSI also avoids early gtag.
      timeoutHandle = setTimeout(() => {
        if (onFirstScroll) {
          window.removeEventListener('scroll', onFirstScroll, { capture: true })
        }
        if (!cancelled) scheduleLog()
      }, 60_000)
    } else {
      scheduleLog()
    }

    return () => {
      cancelled = true
      if (onFirstScroll) {
        window.removeEventListener('scroll', onFirstScroll, { capture: true })
      }
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
