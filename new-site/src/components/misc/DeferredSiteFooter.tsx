'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { isColdVisitorDeferPath } from '@/utils/coldVisitorPerf'

const Footer = dynamic(() => import('./Footer/Footer'), { ssr: false })

/**
 * On public pages, keep the footer chunk off the LCP critical path until idle.
 * Admin/login mount immediately.
 */
export default function DeferredSiteFooter() {
  const pathname = usePathname() ?? '/'
  const deferFooter = isColdVisitorDeferPath(pathname)
  const [ready, setReady] = useState(!deferFooter)

  useEffect(() => {
    if (!deferFooter) {
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
  }, [deferFooter])

  if (!ready) return null
  return <Footer />
}
