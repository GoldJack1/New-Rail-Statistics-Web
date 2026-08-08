'use client'

import CarouselHero from '@/components/heros/CarouselHero/CarouselHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_HERO_7_SLIDES } from '../homeHeroMedia'

const tryOnStationsCta = {
  label: 'Try on Stations',
  href: '/stations',
  target: '_self' as const
}

const SLIDES: CarouselHeroSlide[] = [
  {
    title: 'Search your way!',
    body: (
      <>
        <p>Find stations by Station name, CRS, or TIPLOC Codes.</p>
        <p>Works in the station list & on the map.</p>
      </>
    ),
    ctas: [tryOnStationsCta],
    media: HOME_HERO_7_SLIDES[0],
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 17_000
  },
  {
    title: (
      <>
        Filters that match
        <br />
        the network
      </>
    ),
    body: (
      <>
        <p>
          Options change with the network you are browsing. Not every filter applies everywhere.
        </p>
        <p>
          Use country, county, and operator where they apply; provinces for Ireland and Northern
          Ireland; and borough filters where borough data is available (Avadable in Greater London
          & Cumbria, expanding to all National Rail stations in the coming year).
        </p>
      </>
    ),
    ctas: [tryOnStationsCta],
    media: HOME_HERO_7_SLIDES[1],
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 24_000
  },
  {
    title: (
      <>
        Lines, openings,
        <br />
        and sort options
      </>
    ),
    body: (
      <>
        <p>For SuperTram, filter by line and date opened.</p>
        <p>Sort the list with the sort-by options available for that network.</p>
      </>
    ),
    ctas: [tryOnStationsCta],
    media: HOME_HERO_7_SLIDES[2],
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 16_000
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
