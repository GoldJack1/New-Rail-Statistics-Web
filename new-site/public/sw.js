/**
 * Lightweight service worker — caches static shell assets (fonts, icons, manifest).
 * Document navigations are always network-first (Next.js SSR/ISR on Netlify).
 */
const CACHE_VERSION = 'rail-stats-static-v1'
const PRECACHE_URLS = [
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/images/south-yorkshire-peoples-network-logo.svg',
  '/media/home/shared/hero.png',
  '/media/home/shared/newherotoplight.png',
  '/media/home/shared/newherotopdark.png',
]

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/media/') ||
    pathname.startsWith('/images/') ||
    /\.(svg|png|jpg|jpeg|webp|woff2?|otf|ttf|ico|webmanifest|json)$/i.test(pathname)
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }

  if (!isStaticAsset(url.pathname)) return

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    })
  )
})
