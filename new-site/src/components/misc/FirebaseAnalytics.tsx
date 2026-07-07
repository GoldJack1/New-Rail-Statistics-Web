'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initializeFirebase, getFirebaseAnalytics } from '@/services/firebase'

/**
 * Logs SPA-style `page_view` events when the route changes (parity with implicit
 * Firebase Analytics behaviour on the old React Router app).
 */
export default function FirebaseAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastLogged = useRef<string | null>(null)

  useEffect(() => {
    const query = searchParams.toString()
    const pagePath = query ? `${pathname}?${query}` : pathname
    if (lastLogged.current === pagePath) return
    lastLogged.current = pagePath

    void (async () => {
      try {
        await initializeFirebase()
        const analytics = getFirebaseAnalytics()
        if (!analytics) return
        const { logEvent } = await import('firebase/analytics')
        logEvent(analytics, 'page_view', {
          page_path: pagePath,
          page_title: document.title,
        })
      } catch {
        /* analytics blocked or unavailable */
      }
    })()
  }, [pathname, searchParams])

  return null
}
