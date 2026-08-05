import type { MouseEvent, ReactNode } from 'react'
import type { ButtonColorVariant } from '../buttons/base/BUTBaseButton/BUTBaseButton'
import type { BUTLinkTarget } from '../buttons/other/BUTLink'
import type {
  HeroImageStackSources,
  HeroMobileTabletUncroppedSettings
} from '../heros/HeroImageStack/HeroImageStack'

/** Per-slide art: dark/light × desktop-tablet / mobile (same shape as `HeroImageStack`). */
export type CarouselHeroSlideImageSources = HeroImageStackSources
export type HeroMediaCropMode = 'cropped' | 'uncropped'

/** How media fills the hero frame. `contain` keeps square art fully in view at all breakpoints. */
export type HeroMediaFit = 'cover' | 'contain'

/** Light/dark themed URLs, with optional mobile/tablet overrides. */
export type HeroThemeMediaSources = {
  light: string
  dark: string
  lightMobile?: string
  darkMobile?: string
}

/** Discriminated media for a slide: square webp image or themed video. */
export type HeroMedia =
  | ({ type: 'image' } & HeroThemeMediaSources)
  | ({ type: 'video' } & HeroThemeMediaSources)

export interface CarouselHeroSlideCta {
  label: string
  /** Wide hero CTA colour; defaults to `accent`. */
  colorVariant?: ButtonColorVariant
  /** Renders as `<a>`. Omit to use `onClick` for an in-app button action. */
  href?: string
  target?: BUTLinkTarget
  onClick?: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
}

export interface CarouselHeroSlide {
  /** Plain string or JSX (e.g. with `<br />` for intentional line breaks). */
  title: ReactNode
  body: ReactNode
  /** Optional autoplay duration override for this slide in milliseconds. */
  autoPlayMs?: number
  /** Optional row below body; one button uses hero width cap, two+ share desktop row rules in CSS. */
  ctas?: CarouselHeroSlideCta[]
  /**
   * `img` alt text when the art is informative. Leave empty for decorative art; the stack wrapper is then
   * `aria-hidden` so assistive tech skips it. Non-empty `imageAlt` removes the wrapper `aria-hidden` so the
   * images are exposed (same alt on light/dark sources).
   */
  imageAlt?: string
  /**
   * Preferred per-slide media: image or video with light/dark (optional mobile) sources.
   * When set, takes precedence over `imageSources` / `videoSources`.
   */
  media?: HeroMedia
  /**
   * Per-slide art: light/dark × desktop-tablet / mobile URLs (`HeroImageStack`).
   * Omitted keys are filled from `defaultImageSources` on `CarouselHero` / `StaticHero`.
   * Prefer `media` for new slides.
   */
  imageSources?: Partial<CarouselHeroSlideImageSources>
  /**
   * Optional themed video art for this slide. When provided (and `media` is omitted),
   * `HeroImageStack` renders video instead of images.
   * Prefer `media: { type: 'video', ... }` for new slides.
   */
  videoSources?: {
    dark: string
    light: string
    darkMobileTablet?: string
    lightMobileTablet?: string
  }
  /** How media fills the frame (`contain` keeps square assets fully visible). */
  mediaFit?: HeroMediaFit
  /** Mobile/tablet media framing for this slide only (defaults to hero-level setting). */
  mobileTabletMediaMode?: HeroMediaCropMode
  /** Optional max scale cap for mobile/tablet uncropped mode. */
  mobileTabletUncroppedMaxScale?: number
  /** Optional fine-grained uncropped tuning for this slide. */
  mobileTabletUncroppedSettings?: HeroMobileTabletUncroppedSettings
}

export function mergeCarouselHeroSlideSources(
  slide: CarouselHeroSlide,
  base: HeroImageStackSources
): HeroImageStackSources {
  const p = slide.imageSources
  if (!p) {
    return {
      darkDesktopTablet: base.darkDesktopTablet,
      darkMobile: base.darkMobile,
      lightDesktopTablet: base.lightDesktopTablet,
      lightMobile: base.lightMobile
    }
  }
  return {
    darkDesktopTablet: p.darkDesktopTablet ?? base.darkDesktopTablet,
    darkMobile: p.darkMobile ?? base.darkMobile,
    lightDesktopTablet: p.lightDesktopTablet ?? base.lightDesktopTablet,
    lightMobile: p.lightMobile ?? base.lightMobile
  }
}

/** Resolve preferred `media`, else legacy `videoSources` / merged `imageSources`. */
export function resolveCarouselHeroSlideMedia(
  slide: CarouselHeroSlide,
  base: HeroImageStackSources
): HeroMedia {
  if (slide.media) return slide.media

  if (slide.videoSources) {
    return {
      type: 'video',
      light: slide.videoSources.light,
      dark: slide.videoSources.dark,
      lightMobile: slide.videoSources.lightMobileTablet,
      darkMobile: slide.videoSources.darkMobileTablet
    }
  }

  const sources = mergeCarouselHeroSlideSources(slide, base)
  return {
    type: 'image',
    light: sources.lightDesktopTablet,
    dark: sources.darkDesktopTablet,
    lightMobile: sources.lightMobile !== sources.lightDesktopTablet ? sources.lightMobile : undefined,
    darkMobile: sources.darkMobile !== sources.darkDesktopTablet ? sources.darkMobile : undefined
  }
}

/** Solid colour for text-panel gradient stops (before transparent fade). */
export type CarouselHeroContentFill = 'bgSecondary' | 'heroTint'

/** ≥1200px: which horizontal half holds the copy panel (LTR). Art stays full-bleed behind. */
export type HeroDesktopPanelSide = 'left' | 'right'

/** Viewports below 1200px: copy panel toward the top or bottom of the stacked hero band. */
export type HeroMobilePanelPosition = 'top' | 'bottom'

/**
 * Within the text panel: horizontal alignment for copy, CTAs, and (carousel) prev/next + indicators.
 * `start` = LTR left; `end` = LTR right.
 */
export type HeroPanelChromeAlign = 'start' | 'end'

/** `hero` (default): hero band title/body sizes. `splash`: large splash copy on desktop only (≥1200px). */
export type HeroTextStyle = 'hero' | 'splash'
