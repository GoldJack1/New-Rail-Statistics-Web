'use client'

import { useEffect } from 'react'
import { HOME_HERO_IMAGE_URLS } from './homeHeroMedia'

const FIRST_HERO_MEDIA_SELECTOR =
  '.home-page__top-static-hero .rs-home-hero-image-stack__media'

function preloadImage(url: string): void {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
}

function isImageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0
}

/**
 * After the first (above-the-fold) hero image finishes loading, warm the browser cache for every
 * other homepage hero image so scroll-in fades paint from cache instead of empty placeholders.
 */
export default function HomeHeroImagePreloader() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false
    let preloadStarted = false
    let pollId = 0
    const watched: HTMLImageElement[] = []

    const startPreload = () => {
      if (cancelled || preloadStarted) return
      preloadStarted = true
      for (const url of HOME_HERO_IMAGE_URLS) {
        preloadImage(url)
      }
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
      for (const img of watched) {
        img.removeEventListener('load', startPreload)
        img.removeEventListener('error', startPreload)
      }
    }
  }, [])

  return null
}
