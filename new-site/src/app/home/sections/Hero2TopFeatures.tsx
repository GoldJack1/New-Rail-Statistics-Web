'use client'

import CarouselHero from '@/components/heros/CarouselHero/CarouselHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

const SLIDES: CarouselHeroSlide[] = [
  {
    title: 'A live station database, ready when you are',
    body: (
      <>
        <p>
          Start ticking off stations straight away with a live database built for rail enthusiasts.
        </p>
        <p>
          Whether you are just starting out or already have a long travel history, Rail Statistics is
          ready to grow with your journeys.
        </p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 18_000
  },
  {
    title: 'Bring your existing station list with you',
    body: (
      <>
        <p>Already using your own file to keep track of visited stations?</p>
        <p>
          You can migrate it to work with the Rail Statistics database, making it easier to continue
          from where you left off.
        </p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 18_000
  },
  {
    title: 'Stay updated when new stations open',
    body: (
      <>
        <p>
          Get notifications when new stations open, so there is no need to keep searching for the
          latest station details yourself.
        </p>
        <p>Rail Statistics helps you stay current as the network changes.</p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 13_000
  },
  {
    title: 'See your progress on the map',
    body: (
      <>
        <p>
          View your station progress on the map and get a clearer picture of how far your travels
          have taken you.
        </p>
        <p>It is a simple and visual way to explore your journey history.</p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 15_000
  }
]

export default function Hero2TopFeatures() {
  return (
    <div className="home-page__hero-row">
      <CarouselHero
        slides={SLIDES}
        ariaLabel="Top features"
        titleHeadingLevel={2}
        pauseOnHover={false}
        pauseOnFocusWithin={false}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
