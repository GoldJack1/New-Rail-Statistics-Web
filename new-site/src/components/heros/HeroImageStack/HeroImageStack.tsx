'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  HERO_IMAGE_DARK_DESKTOP_TABLET,
  HERO_IMAGE_DARK_MOBILE,
  HERO_IMAGE_LIGHT_DESKTOP_TABLET,
  HERO_IMAGE_LIGHT_MOBILE
} from '../heroImageConstants'
import type { HeroMedia, HeroMediaFit } from '../../models/heroCarouselSlideModel'
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
  /** IntersectionObserver root margin before starting video download (lazy heroes use a tighter margin). */
  approachRootMargin?: string
  /**
   * Preferred media: image or video with light/dark (+ optional mobile) sources.
   * When set, takes precedence over `sources` / `videoSources`.
   */
  media?: HeroMedia
  /** When set (and `media` omitted), replaces built-in image paths. */
  sources?: HeroImageStackSources
  /** Optional themed videos. When present (and `media` omitted), videos render instead of images. */
  videoSources?: {
    dark: string
    light: string
    darkMobileTablet?: string
    lightMobileTablet?: string
  }
  /** Prefer lower-quality/mobile-tablet video sources when available. */
  videoQuality?: 'standard' | 'low'
  /**
   * How media fills the frame. `contain` keeps square assets fully in view at all breakpoints.
   * Defaults to `cover` (legacy crop/overflow behaviour).
   */
  mediaFit?: HeroMediaFit
  /** Mobile/tablet media framing mode (ignored when `mediaFit` is `contain`). */
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

const MOBILE_TABLET_PICTURE_MEDIA = '(max-width: 1199px)'

/**
 * Every hero `.webm` ships with a same-path `.mp4` sibling (re-encoded for browsers — chiefly
 * Safari — that don't reliably support WebM playback). We only author `.webm` paths in slide data,
 * so derive the fallback here rather than duplicating both paths everywhere videos are declared.
 */
function mp4FallbackSrc(webmSrc: string | undefined): string | undefined {
  if (!webmSrc) return undefined
  return webmSrc.toLowerCase().endsWith('.webm') ? `${webmSrc.slice(0, -'.webm'.length)}.mp4` : undefined
}

function readDocumentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

function browserSupportsWebM(): boolean {
  if (typeof document === 'undefined') return true
  const probe = document.createElement('video')
  return probe.canPlayType('video/webm; codecs="vp9"') !== '' || probe.canPlayType('video/webm') !== ''
}

function resolveMedia(
  media: HeroMedia | undefined,
  sources: HeroImageStackSources | undefined,
  videoSources: HeroImageStackProps['videoSources']
): HeroMedia {
  if (media) return media

  if (videoSources) {
    return {
      type: 'video',
      light: videoSources.light,
      dark: videoSources.dark,
      lightMobile: videoSources.lightMobileTablet,
      darkMobile: videoSources.darkMobileTablet
    }
  }

  const darkDesktopTablet = sources?.darkDesktopTablet ?? HERO_IMAGE_DARK_DESKTOP_TABLET
  const darkMobile = sources?.darkMobile ?? HERO_IMAGE_DARK_MOBILE
  const lightDesktopTablet = sources?.lightDesktopTablet ?? HERO_IMAGE_LIGHT_DESKTOP_TABLET
  const lightMobile = sources?.lightMobile ?? HERO_IMAGE_LIGHT_MOBILE

  return {
    type: 'image',
    light: lightDesktopTablet,
    dark: darkDesktopTablet,
    lightMobile: lightMobile !== lightDesktopTablet ? lightMobile : undefined,
    darkMobile: darkMobile !== darkDesktopTablet ? darkMobile : undefined
  }
}

const VARIANT_MODIFIER: Record<HeroImageStackVariant, string> = {
  carousel: 'rs-home-hero-image-stack--carousel-hero',
  static: 'rs-home-hero-image-stack--static-hero'
}

const HeroImageStack: React.FC<HeroImageStackProps> = ({
  variant,
  loading = 'eager',
  videoPreload,
  approachRootMargin,
  media,
  sources,
  videoSources,
  mobileTabletMediaMode = 'cropped',
  mediaFit = 'cover',
  mobileTabletUncroppedSettings,
  mobileTabletUncroppedMaxScale,
  isActive = true,
  videoLoop = false,
  videoQuality = 'low',
  alt = ''
}) => {
  const resolvedMedia = resolveMedia(media, sources, videoSources)
  const isVideo = resolvedMedia.type === 'video'
  const decorative = alt.trim() === ''
  const rootRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isInViewport, setIsInViewport] = useState(false)
  /**
   * Once a hero has scrolled near the viewport we keep preloading its video permanently — this only
   * gates the *initial* download so far-below-the-fold heroes (e.g. later carousel rows/slides) don't
   * all compete for bandwidth with the first hero on page load.
   */
  const [hasApproachedViewport, setHasApproachedViewport] = useState(false)
  /** Stack has intersected the viewport (fade still waits for decoded media). */
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false)
  /** Active theme image/video has pixels ready to paint. */
  const [mediaReady, setMediaReady] = useState(false)
  /** Sticky: viewport + decoded media — starts the CSS fade once, then stays on. */
  const [hasAppeared, setHasAppeared] = useState(false)
  const [isMobileTabletViewport, setIsMobileTabletViewport] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readDocumentTheme())
  const [supportsWebM] = useState(() => browserSupportsWebM())
  const lightImgRef = useRef<HTMLImageElement | null>(null)
  const darkImgRef = useRef<HTMLImageElement | null>(null)

  const resolvedApproachMargin =
    approachRootMargin ?? (loading === 'eager' ? '400px 0px' : '120px 0px')

  const useContainFit = mediaFit === 'contain'
  const useUncroppedMobile =
    !useContainFit && mobileTabletMediaMode === 'uncropped'

  useEffect(() => {
    if (hasAppeared) return
    if (hasEnteredViewport && mediaReady) setHasAppeared(true)
  }, [hasAppeared, hasEnteredViewport, mediaReady])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInViewport(true)
      setHasApproachedViewport(true)
      setHasEnteredViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting)
        if (entry.isIntersecting) {
          setHasApproachedViewport(true)
          setHasEnteredViewport(true)
        }
      },
      { threshold: 0.2 }
    )
    const approachObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasApproachedViewport(true)
      },
      { rootMargin: resolvedApproachMargin }
    )

    observer.observe(root)
    approachObserver.observe(root)
    return () => {
      observer.disconnect()
      approachObserver.disconnect()
    }
  }, [resolvedApproachMargin])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onThemeChange = () => setTheme(readDocumentTheme())
    const observer = new MutationObserver(onThemeChange)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
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

  const markImageReady = (img: HTMLImageElement | null) => {
    if (!img || !(img.complete && img.naturalWidth > 0)) return
    const finish = () => setMediaReady(true)
    if (typeof img.decode === 'function') {
      void img.decode().then(finish).catch(finish)
      return
    }
    finish()
  }

  const onThemeImageLoad = (imgTheme: 'light' | 'dark') => (
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    if (imgTheme !== theme) return
    markImageReady(event.currentTarget)
  }

  // Sync ready state for the visible theme image (cache hits / theme changes before first fade).
  useEffect(() => {
    if (isVideo || hasAppeared) return
    const img = theme === 'dark' ? darkImgRef.current : lightImgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      markImageReady(img)
      return
    }
    setMediaReady(false)
  }, [
    theme,
    isVideo,
    hasAppeared,
    resolvedMedia.light,
    resolvedMedia.dark,
    resolvedMedia.lightMobile,
    resolvedMedia.darkMobile
  ])

  const eagerVideoPreload = loading === 'eager' ? 'auto' : 'metadata'
  const resolvedVideoPreload = videoPreload ?? (hasApproachedViewport ? eagerVideoPreload : 'none')

  const preferLowQuality = videoQuality === 'low'
  const darkVideoSrc =
    isMobileTabletViewport && resolvedMedia.darkMobile
      ? resolvedMedia.darkMobile
      : resolvedMedia.dark
  const lightVideoSrc =
    isMobileTabletViewport && resolvedMedia.lightMobile
      ? resolvedMedia.lightMobile
      : resolvedMedia.light
  const activeVideoSrc = theme === 'dark' ? darkVideoSrc : lightVideoSrc

  /** Carousel cells only mount video for the active slide; static heroes mount once approached. */
  const shouldMountVideo =
    isVideo &&
    hasApproachedViewport &&
    (variant === 'static' || isActive) &&
    Boolean(activeVideoSrc)

  useEffect(() => {
    if (!shouldMountVideo || !isVideo) return
    const el = videoRef.current
    if (!el || el.readyState > 0 || !el.querySelector('source')) return
    el.load()
  }, [shouldMountVideo, isVideo, activeVideoSrc])

  useEffect(() => {
    if (!isVideo || hasAppeared) return
    if (!shouldMountVideo) {
      setMediaReady(false)
      return
    }
    const el = videoRef.current
    if (!el) return
    if (el.readyState >= 2) {
      setMediaReady(true)
      return
    }
    const onReady = () => setMediaReady(true)
    el.addEventListener('loadeddata', onReady)
    return () => el.removeEventListener('loadeddata', onReady)
  }, [isVideo, shouldMountVideo, activeVideoSrc, hasAppeared])

  useEffect(() => {
    if (!isVideo) return

    const el = videoRef.current
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
  }, [isActive, isInViewport, isVideo, shouldMountVideo])

  return (
    <div
      ref={rootRef}
      className={[
        'rs-home-hero-image-stack',
        VARIANT_MODIFIER[variant],
        useContainFit ? 'rs-home-hero-image-stack--media-fit-contain' : '',
        useUncroppedMobile ? 'rs-home-hero-image-stack--mobile-tablet-uncropped' : '',
        hasAppeared ? 'rs-home-hero-image-stack--appeared' : ''
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
        {isVideo ? (
          shouldMountVideo ? (
            <div
              className={[
                'rs-home-hero-image-stack__picture',
                theme === 'dark'
                  ? 'rs-home-hero-image-stack__picture--dark'
                  : 'rs-home-hero-image-stack__picture--light'
              ].join(' ')}
            >
              <video
                key={activeVideoSrc ?? 'hero-video-disabled'}
                ref={videoRef}
                className="rs-home-hero-image-stack__media"
                muted
                playsInline
                loop={videoLoop}
                preload={preferLowQuality && isMobileTabletViewport ? 'metadata' : resolvedVideoPreload}
                aria-hidden={decorative ? true : undefined}
              >
                {activeVideoSrc ? (
                  supportsWebM ? (
                    <source src={activeVideoSrc} type="video/webm" />
                  ) : (
                    <source src={mp4FallbackSrc(activeVideoSrc)} type="video/mp4" />
                  )
                ) : null}
              </video>
            </div>
          ) : null
        ) : (
          <>
            <picture className="rs-home-hero-image-stack__picture rs-home-hero-image-stack__picture--dark">
              {resolvedMedia.darkMobile ? (
                <source media={MOBILE_TABLET_PICTURE_MEDIA} srcSet={resolvedMedia.darkMobile} />
              ) : null}
              <img
                ref={darkImgRef}
                className="rs-home-hero-image-stack__media"
                src={resolvedMedia.dark}
                alt={alt}
                loading={loading}
                decoding="async"
                onLoad={onThemeImageLoad('dark')}
              />
            </picture>
            <picture className="rs-home-hero-image-stack__picture rs-home-hero-image-stack__picture--light">
              {resolvedMedia.lightMobile ? (
                <source media={MOBILE_TABLET_PICTURE_MEDIA} srcSet={resolvedMedia.lightMobile} />
              ) : null}
              <img
                ref={lightImgRef}
                className="rs-home-hero-image-stack__media"
                src={resolvedMedia.light}
                alt={alt}
                loading={loading}
                decoding="async"
                onLoad={onThemeImageLoad('light')}
              />
            </picture>
          </>
        )}
      </div>
    </div>
  )
}

export default HeroImageStack
