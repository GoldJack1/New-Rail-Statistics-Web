'use client'

import StaticHero from '@/components/heros/StaticHero/StaticHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

const SLIDE: CarouselHeroSlide = {
  title: 'Keep track of the stations you love',
  body: (
    <>
      <p>
        Found a station that stands out to you? Now you can mark it as a favourite to easily find it
        later.
      </p>
      <p>
        This is a great way to build your own shortlist of memorable places across the network.
      </p>
    </>
  ),
  media: HOME_TEST_MEDIA,
  mediaFit: HOME_SQUARE_MEDIA_FIT,
  mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS
}

export default function Hero4Favourites() {
  return (
    <div className="home-page__hero-row">
      <StaticHero
        slide={SLIDE}
        ariaLabel="Favourite stations"
        contentFill="heroTint"
        desktopContentVerticalAlign="center"
        desktopPanelSide="right"
        mobilePanelPosition="bottom"
        titleHeadingLevel={2}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
