'use client'

import CarouselHero from '@/components/heros/CarouselHero/CarouselHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

const SLIDES: CarouselHeroSlide[] = [
  {
    title: 'Enjoy an ad-free experience',
    body: (
      <>
        <p>
          Included with Standard Premium and First Class, an ad-free experience lets you focus fully
          on tracking your journeys without distractions.
        </p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 15_000
  },
  {
    title: 'Unlock home-screen widgets',
    body: (
      <>
        <p>
          Included with Standard Premium and First Class, home-screen widgets make it easy to keep
          your station visit progress visible at a glance every day.
        </p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 15_000
  },
  {
    title: 'Be first to try ticket tracking in beta',
    body: (
      <>
        <p>
          Exclusive to First Class, be the first to try Ticket Tracking in beta when it launches in
          beta in summer 2026.
        </p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 15_000
  }
]

export default function Hero7Subscription() {
  return (
    <div className="home-page__hero-row">
      <CarouselHero
        slides={SLIDES}
        ariaLabel="Subscription features"
        titleHeadingLevel={2}
        pauseOnHover={false}
        pauseOnFocusWithin={false}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
