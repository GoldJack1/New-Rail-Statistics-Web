'use client'

import { useEffect } from 'react'

/**
 * Registers the PWA service worker in production only (matches old Vite PWA behaviour).
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('[PWA] Service worker registration failed:', err)
    })
  }, [])

  return null
}
