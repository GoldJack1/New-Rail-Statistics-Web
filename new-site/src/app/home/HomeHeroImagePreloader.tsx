'use client'

import { useEffect } from 'react'
import { HOME_HERO_IMAGE_URLS } from './homeHeroMedia'

const FIRST_HERO_MEDIA_SELECTOR =
  '.home-page__top-static-hero .rs-home-hero-image-stack__media'

/** Cap concurrent warm-ups so mobile Safari doesn't decode ~20MB of WebPs at once. */
const PRELOAD_CONCURRENCY = 2
/** Stagger starts so decode/network pressure stays low while the user scrolls. */
const PRELOAD_GAP_MS = 350

function isImageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0
}

function isMemoryConstrainedUi(): boolean {
  if (typeof window === 'undefined') return true
  const coarse =
    window.matchMedia('(any-pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches
  // Skip bulk warm-up on touch / small viewports — iOS Safari Jetsams under mass Image() decode.
  return coarse || window.matchMedia('(max-width: 1199px)').matches
}

/**
 * After the first (above-the-fold) hero image finishes loading, gently warm the browser cache for
 * remaining homepage hero images (desktop only). Mobile skips this — decoding every slide up front
 * was crashing Safari on iOS; scroll-in fades still run once each image loads naturally.
 */
export default function HomeHeroImagePreloader() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isMemoryConstrainedUi()) return

    let cancelled = false
    let preloadStarted = false
    let pollId = 0
    let gapTimer = 0
    const watched: HTMLImageElement[] = []
    const queue = HOME_HERO_IMAGE_URLS.slice()
    let inFlight = 0

    const pump = () => {
      if (cancelled) return
      while (inFlight < PRELOAD_CONCURRENCY && queue.length > 0) {
        const url = queue.shift()
        if (!url) break
        inFlight += 1
        const img = new Image()
        const onDone = () => {
          inFlight -= 1
          if (cancelled) return
          gapTimer = window.setTimeout(pump, PRELOAD_GAP_MS)
        }
        img.decoding = 'async'
        img.addEventListener('load', onDone, { once: true })
        img.addEventListener('error', onDone, { once: true })
        img.src = url
      }
    }

    const startPreload = () => {
      if (cancelled || preloadStarted) return
      preloadStarted = true
      pump()
    }

    const watchImg = (img: HTMLImageElement) => {
      if (isImageReady(img)) {
        startPreload()
        return
      }
      watched.push(img)
      img.addEventListener('load', startPreload)
      img.addEventListener('error', startPreload)
    }

    const tryAttach = () => {
      if (cancelled || preloadStarted) return true
      const imgs = document.querySelectorAll(FIRST_HERO_MEDIA_SELECTOR)
      if (imgs.length === 0) return false
      imgs.forEach((node) => {
        if (node instanceof HTMLImageElement) watchImg(node)
      })
      return true
    }

    if (!tryAttach()) {
      pollId = window.setInterval(() => {
        if (tryAttach()) window.clearInterval(pollId)
      }, 50)
    }

    return () => {
      cancelled = true
      if (pollId) window.clearInterval(pollId)
      if (gapTimer) window.clearTimeout(gapTimer)
      for (const img of watched) {
        img.removeEventListener('load', startPreload)
        img.removeEventListener('error', startPreload)
      }
    }
  }, [])

  return null
}
