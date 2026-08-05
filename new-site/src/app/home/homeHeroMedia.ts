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

/** Temporary square placeholder art standing in for every home hero while final media is produced. */
export const HOME_TEST_MEDIA: HeroMedia = homeHeroImage({
  light: '/media/home/test/light.webp',
  dark: '/media/home/test/dark.webp'
})
