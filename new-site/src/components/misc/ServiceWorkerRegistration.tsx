'use client'

import { useEffect } from 'react'

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'
const SW_RELOAD_GUARD_KEY = 'rs-sw-controller-reload'

/**
 * Registers the PWA service worker in production only (matches old Vite PWA behaviour).
 * Reloads once when a *new* deploy takes over an already-controlled page — not on the first
 * time a worker claims the tab (that was causing a visible load → instant reload flash).
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let refreshing = false
    let intervalId: number | undefined

    const onControllerChange = () => {
      if (refreshing) return
      try {
        if (sessionStorage.getItem(SW_RELOAD_GUARD_KEY) === BUILD_ID) return
        sessionStorage.setItem(SW_RELOAD_GUARD_KEY, BUILD_ID)
      } catch {
        // sessionStorage may be blocked; still allow a single in-memory reload.
      }
      refreshing = true
      window.location.reload()
    }

    // Only listen when this page was already controlled — update path, not first install.
    const hadController = Boolean(navigator.serviceWorker.controller)
    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    }

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
      if (hadController) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      }
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [])

  return null
}
