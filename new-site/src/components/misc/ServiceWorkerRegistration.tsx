'use client'

import { useEffect } from 'react'

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'

/**
 * Registers the PWA service worker in production only (matches old Vite PWA behaviour).
 * Checks for updates on each load and reloads once when a new deploy activates.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let refreshing = false
    let intervalId: number | undefined

    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const swUrl = `/sw.js?v=${encodeURIComponent(BUILD_ID)}`

    void navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((registration) => {
        void registration.update()
        intervalId = window.setInterval(() => {
          void registration.update()
        }, 60 * 60 * 1000)
      })
      .catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err)
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [])

  return null
}
