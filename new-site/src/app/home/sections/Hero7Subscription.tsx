'use client'

import CarouselHero from '@/components/heros/CarouselHero/CarouselHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_HERO_9_SLIDES } from '../homeHeroMedia'

const SLIDES: CarouselHeroSlide[] = [
  {
    title: 'Enjoy an ad-free experience (App Only)',
    body: (
      <p>
        Included with Standard Premium and First Class. Focus on tracking your journeys without
        distractions.
      </p>
    ),
    media: HOME_HERO_9_SLIDES[0],
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 15_000
  },
  {
    title: 'Unlock home-screen widgets (App Only)',
    body: (
      <p>
        Included with Standard Premium and First Class. Keep your station visit progress visible at
        a glance.
      </p>
    ),
    media: HOME_HERO_9_SLIDES[1],
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 15_000
  },
  {
    title: (
      <>
        Be first to try
        <br />
        Ticket Tracking (App Only)
      </>
    ),
    body: (
      <p>
        Exclusive to First Class. Try Ticket Tracking in beta when it launches in late 2026/Early
        2027.
      </p>
    ),
    media: HOME_HERO_9_SLIDES[2],
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
