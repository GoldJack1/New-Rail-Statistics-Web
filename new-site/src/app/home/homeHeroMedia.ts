import type { HeroMedia } from '@/components/heros'

/** Build a themed square image media entry (same path for both themes when art is theme-agnostic). */
export function homeHeroImage(src: { light: string; dark: string }): HeroMedia {
  return { type: 'image', light: src.light, dark: src.dark }
}

/** Build a themed video media entry (author `.webm`; mp4 sibling is derived at render time). */
export function homeHeroVideo(src: {
  light: string
  dark: string
  lightMobile?: string
  darkMobile?: string
}): HeroMedia {
  return {
    type: 'video',
    light: src.light,
    dark: src.dark,
    ...(src.lightMobile ? { lightMobile: src.lightMobile } : {}),
    ...(src.darkMobile ? { darkMobile: src.darkMobile } : {})
  }
}

/** Convenience for a single theme-agnostic square webp used in both light and dark. */
export function homeHeroSharedImage(src: string): HeroMedia {
  return homeHeroImage({ light: src, dark: src })
}

function slidePair(hero: string, slide: number): HeroMedia {
  return homeHeroImage({
    light: `/media/home/${hero}/slide${slide}/light.webp`,
    dark: `/media/home/${hero}/slide${slide}/dark.webp`
  })
}

/** Hero 1 — top download splash. */
export const HOME_HERO_1_MEDIA = slidePair('hero1', 1)

/** Hero 4 — new-station notifications. */
export const HOME_HERO_4_MEDIA = slidePair('hero4', 1)

/** Hero 5 — station detail carousel (3 slides). */
export const HOME_HERO_5_SLIDES = [slidePair('hero5', 1), slidePair('hero5', 2), slidePair('hero5', 3)] as const

/** Hero 6 — map hybrid carousel (2 slides). */
export const HOME_HERO_6_SLIDES = [slidePair('hero6', 1), slidePair('hero6', 2)] as const

/** Hero 7 — search / filter carousel (3 slides). */
export const HOME_HERO_7_SLIDES = [slidePair('hero7', 1), slidePair('hero7', 2), slidePair('hero7', 3)] as const

/** Hero 8 — visits / favourites carousel (2 slides). */
export const HOME_HERO_8_SLIDES = [slidePair('hero8', 1), slidePair('hero8', 2)] as const

/** Hero 9 — subscription carousel (3 slides). */
export const HOME_HERO_9_SLIDES = [slidePair('hero9', 1), slidePair('hero9', 2), slidePair('hero9', 3)] as const

/**
 * Closing download splash — no dedicated Final art yet; reuses Hero 1 until one is supplied.
 */
export const HOME_HERO_CLOSING_MEDIA = HOME_HERO_1_MEDIA

/** Hero 11 — migrate splash. */
export const HOME_HERO_11_MEDIA = slidePair('hero11', 1)

function imageUrlsFromMedia(media: HeroMedia): string[] {
  if (media.type !== 'image') return []
  return [media.light, media.dark, media.lightMobile, media.darkMobile].filter(
    (url): url is string => Boolean(url)
  )
}

/** Every unique homepage hero image URL (light + dark, all slides). Used to warm the cache after hero 1 loads. */
export const HOME_HERO_IMAGE_URLS: readonly string[] = Array.from(
  new Set(
    [
      HOME_HERO_1_MEDIA,
      HOME_HERO_4_MEDIA,
      ...HOME_HERO_5_SLIDES,
      ...HOME_HERO_6_SLIDES,
      ...HOME_HERO_7_SLIDES,
      ...HOME_HERO_8_SLIDES,
      ...HOME_HERO_9_SLIDES,
      HOME_HERO_CLOSING_MEDIA,
      HOME_HERO_11_MEDIA
    ].flatMap(imageUrlsFromMedia)
  )
)
