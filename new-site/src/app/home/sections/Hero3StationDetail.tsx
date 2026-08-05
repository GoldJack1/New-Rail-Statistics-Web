'use client'

import StaticHero from '@/components/heros/StaticHero/StaticHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

const SLIDE: CarouselHeroSlide = {
  title: 'Dive deeper with detailed station pages',
  body: (
    <>
      <p>
        Explore a wide range of station details, including yearly station usage figures from the
        Office of Rail and Road.
      </p>
      <p>
        When new data is released, Rail Statistics is updated so you can keep exploring with the
        latest information.
      </p>
    </>
  ),
  media: HOME_TEST_MEDIA,
  mediaFit: HOME_SQUARE_MEDIA_FIT,
  mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS
}

export default function Hero3StationDetail() {
  return (
    <div className="home-page__hero-row">
      <StaticHero
        slide={SLIDE}
        ariaLabel="Detailed station pages"
        desktopContentVerticalAlign="center"
        desktopPanelSide="right"
        titleHeadingLevel={2}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
