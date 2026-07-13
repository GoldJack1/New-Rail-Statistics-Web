'use client'

import { useEffect, useRef } from 'react'
import { scheduleLayoutRead } from '@/utils/scheduleLayoutRead'

/**
 * Mirrors the fixed `.universal-header` height into `--app-header-offset` so main padding,
 * PageTopHeader sticky top, and the secondary chrome gradient stay aligned when breakpoints
 * or the mobile nav change the header’s rendered size.
 */
export function useAppHeaderOffset<T extends HTMLElement>(resyncWhen?: unknown) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const sync = () => {
      const height = el.getBoundingClientRect().height
      document.documentElement.style.setProperty('--app-header-offset', `${height}px`)
    }
    const onResize = () => scheduleLayoutRead(sync)

    scheduleLayoutRead(sync)

    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    window.addEventListener('resize', onResize)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      document.documentElement.style.removeProperty('--app-header-offset')
    }
  }, [resyncWhen])

  return ref
}
