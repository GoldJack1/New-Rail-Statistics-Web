import { describe, expect, it } from 'vitest'
import {
  mergeCarouselHeroSlideSources,
  resolveCarouselHeroSlideMedia,
  type CarouselHeroSlide
} from './heroCarouselSlideModel'

const base = {
  darkDesktopTablet: '/d-dt.png',
  darkMobile: '/d-m.png',
  lightDesktopTablet: '/l-dt.png',
  lightMobile: '/l-m.png'
}

describe('mergeCarouselHeroSlideSources', () => {
  it('returns base when slide has no partial sources', () => {
    const slide: CarouselHeroSlide = { title: 'T', body: 'B' }
    expect(mergeCarouselHeroSlideSources(slide, base)).toEqual(base)
  })

  it('merges partial overrides', () => {
    const slide: CarouselHeroSlide = {
      title: 'T',
      body: 'B',
      imageSources: { lightMobile: '/only-light-mobile.png' }
    }
    expect(mergeCarouselHeroSlideSources(slide, base)).toEqual({
      ...base,
      lightMobile: '/only-light-mobile.png'
    })
  })
})

describe('resolveCarouselHeroSlideMedia', () => {
  it('prefers slide.media when set', () => {
    const slide: CarouselHeroSlide = {
      title: 'T',
      body: 'B',
      media: { type: 'image', light: '/a.webp', dark: '/b.webp' },
      videoSources: { light: '/ignore.webm', dark: '/ignore-dark.webm' }
    }
    expect(resolveCarouselHeroSlideMedia(slide, base)).toEqual({
      type: 'image',
      light: '/a.webp',
      dark: '/b.webp'
    })
  })

  it('maps legacy videoSources to video media', () => {
    const slide: CarouselHeroSlide = {
      title: 'T',
      body: 'B',
      videoSources: {
        light: '/light.webm',
        dark: '/dark.webm',
        lightMobileTablet: '/light-m.webm',
        darkMobileTablet: '/dark-m.webm'
      }
    }
    expect(resolveCarouselHeroSlideMedia(slide, base)).toEqual({
      type: 'video',
      light: '/light.webm',
      dark: '/dark.webm',
      lightMobile: '/light-m.webm',
      darkMobile: '/dark-m.webm'
    })
  })

  it('maps merged image sources when no media or video', () => {
    const slide: CarouselHeroSlide = { title: 'T', body: 'B' }
    expect(resolveCarouselHeroSlideMedia(slide, base)).toEqual({
      type: 'image',
      light: '/l-dt.png',
      dark: '/d-dt.png',
      lightMobile: '/l-m.png',
      darkMobile: '/d-m.png'
    })
  })

  it('omits mobile image overrides when identical to desktop', () => {
    const same = {
      darkDesktopTablet: '/same-d.webp',
      darkMobile: '/same-d.webp',
      lightDesktopTablet: '/same-l.webp',
      lightMobile: '/same-l.webp'
    }
    const slide: CarouselHeroSlide = { title: 'T', body: 'B' }
    expect(resolveCarouselHeroSlideMedia(slide, same)).toEqual({
      type: 'image',
      light: '/same-l.webp',
      dark: '/same-d.webp'
    })
  })
})
