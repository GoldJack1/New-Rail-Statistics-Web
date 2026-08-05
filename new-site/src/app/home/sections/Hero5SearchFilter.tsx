'use client'

import CarouselHero from '@/components/heros/CarouselHero/CarouselHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

const SLIDES: CarouselHeroSlide[] = [
  {
    title: 'Search your way',
    body: (
      <>
        <p>
          Find stations in list view or on the map by station name, National Rail CRS code, or
          TIPLOC code.
        </p>
        <p>
          Whether you search casually or know exactly what you are looking for, Rail Statistics helps
          you get there faster.
        </p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 17_000
  },
  {
    title: 'Filter stations with more control',
    body: (
      <>
        <p>Use advanced filters to browse stations by country, county, and operator.</p>
        <p>
          You can also narrow down stations within Greater London by all 33 London boroughs for more
          detailed exploration.
        </p>
      </>
    ),
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 44_000
  }
]

export default function Hero5SearchFilter() {
  return (
    <div className="home-page__hero-row">
      <CarouselHero
        slides={SLIDES}
        ariaLabel="Search and filtering options"
        titleHeadingLevel={2}
        pauseOnHover={false}
        pauseOnFocusWithin={false}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
