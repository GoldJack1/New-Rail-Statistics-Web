'use client'

import StaticHero from '@/components/heros/StaticHero/StaticHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

const SLIDE: CarouselHeroSlide = {
  title: 'A simple way to remember when you visited',
  body: (
    <>
      <p>
        When you mark a station as visited, Rail Statistics automatically adds the current date by
        default.
      </p>
      <p>
        That makes it easy to keep track of when each visit happened as your journey history grows.
      </p>
    </>
  ),
  media: HOME_TEST_MEDIA,
  mediaFit: HOME_SQUARE_MEDIA_FIT,
  mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS
}

export default function Hero6VisitTracking() {
  return (
    <div className="home-page__hero-row">
      <StaticHero
        slide={SLIDE}
        ariaLabel="Easy visit tracking"
        desktopContentVerticalAlign="center"
        desktopPanelSide="right"
        titleHeadingLevel={2}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
