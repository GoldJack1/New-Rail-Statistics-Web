'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

const Footer = dynamic(() => import('./Footer/Footer'), { ssr: false })

/**
 * On public `/stations`, keep the footer chunk off the LCP critical path until
 * the main thread is idle (or a short fallback). Other routes mount immediately.
 */
export default function DeferredSiteFooter() {
  const pathname = usePathname() ?? '/'
  const deferForStations = pathname === '/stations'
  const [ready, setReady] = useState(!deferForStations)

  useEffect(() => {
    if (!deferForStations) {
      setReady(true)
      return
    }

    let idleHandle: number | undefined
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const enable = () => setReady(true)

    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(enable, { timeout: 4_000 })
    } else {
      timeoutHandle = setTimeout(enable, 2_500)
    }

    return () => {
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle)
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }
  }, [deferForStations])

  if (!ready) return null
  return <Footer />
}
