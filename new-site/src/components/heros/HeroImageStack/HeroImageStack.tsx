'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  HERO_IMAGE_DARK_DESKTOP_TABLET,
  HERO_IMAGE_DARK_MOBILE,
  HERO_IMAGE_LIGHT_DESKTOP_TABLET,
  HERO_IMAGE_LIGHT_MOBILE
} from '../heroImageConstants'
import './HeroImageStack.css'

export type HeroImageStackVariant = 'carousel' | 'static'

/** Overrides default hero art URLs (per-slide carousel art, tests, etc.). */
export interface HeroImageStackSources {
  darkDesktopTablet: string
  darkMobile: string
  lightDesktopTablet: string
  lightMobile: string
}

export interface HeroMobileTabletUncroppedSettings {
  /** Multiplies mobile/tablet uncropped scale response speed. */
  scaleSpeed?: number
  /** Caps mobile/tablet uncropped scale. */
  maxScale?: number
  /** Shared media width while uncropped on mobile/tablet (fallback). */
  mediaWidthPercent?: number
  /** Mobile-only media width while uncropped (<=420px). */
  mobileMediaWidthPercent?: number
  /** Tablet-only media width while uncropped (421px-1023px). */
  tabletMediaWidthPercent?: number
  /** Top offset for uncropped images on mobile/tablet. */
  imageTopPercent?: number
  /** Top offset for uncropped videos on mobile/tablet. */
  videoTopPercent?: number
  /** Shared top offset on tablet-sized uncropped viewports. */
  tabletTopPercent?: number
}

export interface HeroImageStackProps {
  variant: HeroImageStackVariant
  /** `eager` for above-the-fold primary hero; `lazy` for lower sections. */
  loading?: 'eager' | 'lazy'
  /** Video preload strategy; defaults to `auto` for eager, `metadata` for lazy. */
  videoPreload?: 'none' | 'metadata' | 'auto'
  /** When set, replaces built-in paths (e.g. merged per-slide sources). */
  sources?: HeroImageStackSources
  /** Optional themed videos. When present, videos render instead of image sources. */
  videoSources?: {
    dark: string
    light: string
    darkMobileTablet?: string
    lightMobileTablet?: string
  }
  /** Prefer lower-quality/mobile-tablet video sources when available. */
  videoQuality?: 'standard' | 'low'
  /** Mobile/tablet media framing mode. */
  mobileTabletMediaMode?: 'cropped' | 'uncropped'
  /** Optional uncropped tuning for this specific usage. */
  mobileTabletUncroppedSettings?: HeroMobileTabletUncroppedSettings
  /** Optional max scale cap for mobile/tablet uncropped mode. */
  mobileTabletUncroppedMaxScale?: number
  /** Active carousel cell should be true so videos only play when visible. */
  isActive?: boolean
  /** When true, rendered videos loop. */
  videoLoop?: boolean
  /** Optional `img` alt when art is meaningful; empty for decorative. */
  alt?: string
}

const DESKTOP_PICTURE_MEDIA = '(min-width: 1200px)'

/**
 * Every hero `.webm` ships with a same-path `.mp4` sibling (re-encoded for browsers — chiefly
 * Safari — that don't reliably support WebM playback). We only author `.webm` paths in slide data,
 * so derive the fallback here rather than duplicating both paths everywhere videos are declared.
 */
function mp4FallbackSrc(webmSrc: string | undefined): string | undefined {
  if (!webmSrc) return undefined
  return webmSrc.toLowerCase().endsWith('.webm') ? `${webmSrc.slice(0, -'.webm'.length)}.mp4` : undefined
}

const VARIANT_MODIFIER: Record<HeroImageStackVariant, string> = {
  carousel: 'rs-home-hero-image-stack--carousel-hero',
  static: 'rs-home-hero-image-stack--static-hero'
}

const HeroImageStack: React.FC<HeroImageStackProps> = ({
  variant,
  loading = 'eager',
  videoPreload,
  sources,
  videoSources,
  mobileTabletMediaMode = 'cropped',
  mobileTabletUncroppedSettings,
  mobileTabletUncroppedMaxScale,
  isActive = true,
  videoLoop = false,
  videoQuality = 'low',
  alt = ''
}) => {
  const darkDesktopTablet = sources?.darkDesktopTablet ?? HERO_IMAGE_DARK_DESKTOP_TABLET
  const darkMobile = sources?.darkMobile ?? HERO_IMAGE_DARK_MOBILE
  const lightDesktopTablet = sources?.lightDesktopTablet ?? HERO_IMAGE_LIGHT_DESKTOP_TABLET
  const lightMobile = sources?.lightMobile ?? HERO_IMAGE_LIGHT_MOBILE
  const decorative = alt.trim() === ''
  const rootRef = useRef<HTMLDivElement | null>(null)
  const darkVideoRef = useRef<HTMLVideoElement | null>(null)
  const lightVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isInViewport, setIsInViewport] = useState(false)
  /**
   * Once a hero has scrolled near the viewport we keep preloading its video permanently — this only
   * gates the *initial* download so far-below-the-fold heroes (e.g. later carousel rows/slides) don't
   * all compete for bandwidth with the first hero on page load.
   */
  const [hasApproachedViewport, setHasApproachedViewport] = useState(false)
  const [isMobileTabletViewport, setIsMobileTabletViewport] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInViewport(true)
      setHasApproachedViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting)
        if (entry.isIntersecting) setHasApproachedViewport(true)
      },
      { threshold: 0.2 }
    )
    // Start buffering slightly before a hero scrolls into view so playback doesn't visibly pop in,
    // while still keeping far-below-the-fold heroes from downloading on initial page load.
    const approachObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasApproachedViewport(true)
      },
      { rootMargin: '800px 0px' }
    )

    observer.observe(root)
    approachObserver.observe(root)
    return () => {
      observer.disconnect()
      approachObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mq = window.matchMedia('(max-width: 1199px)')
    const onChange = () => setIsMobileTabletViewport(mq.matches)
    onChange()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [])

  const eagerVideoPreload = loading === 'eager' ? 'auto' : 'metadata'
  /**
   * Regardless of `loading`, never eagerly download video bytes for a hero that hasn't scrolled
   * near the viewport yet — otherwise every hero/carousel-slide on the page (there can be 15+)
   * starts downloading at once on load and starves the one the user can actually see.
   */
  const resolvedVideoPreload = videoPreload ?? (hasApproachedViewport ? eagerVideoPreload : 'none')

  const preferLowQuality = videoQuality === 'low'
  const darkVideoSrc = isMobileTabletViewport && videoSources?.darkMobileTablet
    ? videoSources.darkMobileTablet
    : videoSources?.dark
  const lightVideoSrc = isMobileTabletViewport && videoSources?.lightMobileTablet
    ? videoSources.lightMobileTablet
    : videoSources?.light

  useEffect(() => {
    if (!hasApproachedViewport || !videoSources) return
    // Some browsers only consult `preload` during initial resource selection, so bumping it from
    // `none` to `auto`/`metadata` after the fact needs an explicit `load()` nudge to take effect.
    // Videos are declared via `<source>` children (for the mp4 fallback), so `el.src` is always
    // empty — check for an actual `<source>` child instead of a `src` attribute.
    const nudge = (el: HTMLVideoElement | null) => {
      if (!el || el.readyState > 0 || !el.querySelector('source')) return
      el.load()
    }
    nudge(darkVideoRef.current)
    nudge(lightVideoRef.current)
  }, [hasApproachedViewport, videoSources])

  useEffect(() => {
    if (!videoSources) return

    const syncVideo = (el: HTMLVideoElement | null) => {
      if (!el) return
      if (!isActive) {
        el.pause()
        el.currentTime = 0
        return
      }
      if (!isInViewport) {
        el.pause()
        return
      }
      if (el.ended) {
        return
      }
      void el.play().catch(() => {
        // Ignore failed autoplay attempts; muted inline videos should usually play.
      })
    }

    syncVideo(darkVideoRef.current)
    syncVideo(lightVideoRef.current)
  }, [isActive, isInViewport, videoSources])

  return (
    <div
      ref={rootRef}
      className={[
        'rs-home-hero-image-stack',
        VARIANT_MODIFIER[variant],
        mobileTabletMediaMode === 'uncropped'
          ? 'rs-home-hero-image-stack--mobile-tablet-uncropped'
          : ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        ({
          ...(mobileTabletUncroppedSettings?.scaleSpeed != null
            ? {
                ['--hero-image-mobile-uncropped-scale-speed' as string]: String(
                  mobileTabletUncroppedSettings.scaleSpeed
                )
              }
            : {}),
          ...((mobileTabletUncroppedSettings?.maxScale ?? mobileTabletUncroppedMaxScale) != null
            ? {
                ['--hero-image-mobile-uncropped-max-scale' as string]: String(
                  mobileTabletUncroppedSettings?.maxScale ?? mobileTabletUncroppedMaxScale
                )
              }
            : {}),
          ...(mobileTabletUncroppedSettings?.mediaWidthPercent != null
            ? {
                ['--hero-image-mobile-uncropped-media-width' as string]: `${mobileTabletUncroppedSettings.mediaWidthPercent}%`
              }
            : {}),
          ...(mobileTabletUncroppedSettings?.mobileMediaWidthPercent != null
            ? {
                ['--hero-image-mobile-uncropped-media-width-mobile' as string]: `${mobileTabletUncroppedSettings.mobileMediaWidthPercent}%`
              }
            : {}),
          ...(mobileTabletUncroppedSettings?.tabletMediaWidthPercent != null
            ? {
                ['--hero-image-mobile-uncropped-media-width-tablet' as string]: `${mobileTabletUncroppedSettings.tabletMediaWidthPercent}%`
              }
            : {}),
          ...(mobileTabletUncroppedSettings?.imageTopPercent != null
            ? {
                ['--hero-image-mobile-uncropped-image-top' as string]: `${mobileTabletUncroppedSettings.imageTopPercent}%`
              }
            : {}),
          ...(mobileTabletUncroppedSettings?.videoTopPercent != null
            ? {
                ['--hero-image-mobile-uncropped-video-top' as string]: `${mobileTabletUncroppedSettings.videoTopPercent}%`
              }
            : {}),
          ...(mobileTabletUncroppedSettings?.tabletTopPercent != null
            ? {
                ['--hero-image-mobile-uncropped-tablet-top' as string]: `${mobileTabletUncroppedSettings.tabletTopPercent}%`
              }
            : {})
        } as React.CSSProperties)
      }
      aria-hidden={decorative ? true : undefined}
    >
      <div className="rs-home-hero-image-stack__frame">
        {videoSources ? (
          <>
            <div className="rs-home-hero-image-stack__picture rs-home-hero-image-stack__picture--dark">
              <video
                key={darkVideoSrc ?? 'dark-video-disabled'}
                ref={darkVideoRef}
                className="rs-home-hero-image-stack__media"
                muted
                playsInline
                loop={videoLoop}
                preload={preferLowQuality && isMobileTabletViewport ? 'metadata' : resolvedVideoPreload}
                aria-hidden={decorative ? true : undefined}
              >
                {darkVideoSrc ? (
                  <>
                    <source src={darkVideoSrc} type="video/webm" />
                    <source src={mp4FallbackSrc(darkVideoSrc)} type="video/mp4" />
                  </>
                ) : null}
              </video>
            </div>
            <div className="rs-home-hero-image-stack__picture rs-home-hero-image-stack__picture--light">
              <video
                key={lightVideoSrc ?? 'light-video-disabled'}
                ref={lightVideoRef}
                className="rs-home-hero-image-stack__media"
                muted
                playsInline
                loop={videoLoop}
                preload={preferLowQuality && isMobileTabletViewport ? 'metadata' : resolvedVideoPreload}
                aria-hidden={decorative ? true : undefined}
              >
                {lightVideoSrc ? (
                  <>
                    <source src={lightVideoSrc} type="video/webm" />
                    <source src={mp4FallbackSrc(lightVideoSrc)} type="video/mp4" />
                  </>
                ) : null}
              </video>
            </div>
          </>
        ) : (
          <>
            <picture className="rs-home-hero-image-stack__picture rs-home-hero-image-stack__picture--dark">
              <source media={DESKTOP_PICTURE_MEDIA} srcSet={darkDesktopTablet} />
              <img
                className="rs-home-hero-image-stack__media"
                src={darkMobile}
                alt={alt}
                loading={loading}
                decoding="async"
              />
            </picture>
            <picture className="rs-home-hero-image-stack__picture rs-home-hero-image-stack__picture--light">
              <source media={DESKTOP_PICTURE_MEDIA} srcSet={lightDesktopTablet} />
              <img
                className="rs-home-hero-image-stack__media"
                src={lightMobile}
                alt={alt}
                loading={loading}
                decoding="async"
              />
            </picture>
          </>
        )}
      </div>
    </div>
  )
}

export default HeroImageStack
