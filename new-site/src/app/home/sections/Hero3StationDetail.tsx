'use client'

import CarouselHero from '@/components/heros/CarouselHero/CarouselHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

const browseStationsCta = {
  label: 'Browse Stations',
  href: '/stations',
  target: '_self' as const
}

const SLIDES: CarouselHeroSlide[] = [
  {
    title: (
      <>
        Go deeper on every
        <br />
        station & stop
      </>
    ),
    body: (
      <>
        <p>
          On the website, each station and tram stop has richer detail, including facilities, network
          information, and more.
        </p>
        <p>So you can explore properly before you visit or whilst you are on the go.</p>
      </>
    ),
    ctas: [browseStationsCta],
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 18_000
  },
  {
    title: (
      <>
        National Rail Stations
        <br />
        with passenger usage data
      </>
    ),
    body: (
      <>
        <p>
          Delve into detailed yearly passenger usage data from the Office of Rail and Road, dating
          back to 1998.
        </p>
        <p>
          Inculding a option to export a graph so you can show the data of station usage for
          whatever you create. (Available for National Rail stations only, with data updated when
          new data is released.)
        </p>
      </>
    ),
    ctas: [browseStationsCta],
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 22_000
  },
  {
    title: 'SuperTram, Translink & Irish Rail.',
    body: (
      <>
        <p>
          Full stop and station pages for Sheffield SuperTram, NI Translink, and Irish Rail, with
          the network detail you need.
        </p>
        <p>Browse every stop and station alongside National Rail in one database.</p>
      </>
    ),
    ctas: [browseStationsCta],
    media: HOME_TEST_MEDIA,
    mediaFit: HOME_SQUARE_MEDIA_FIT,
    mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
    autoPlayMs: 18_000
  }
]

export default function Hero3StationDetail() {
  return (
    <div className="home-page__hero-row">
      <CarouselHero
        slides={SLIDES}
        ariaLabel="Detailed station and stop pages"
        titleHeadingLevel={2}
        pauseOnHover={false}
        pauseOnFocusWithin={false}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
