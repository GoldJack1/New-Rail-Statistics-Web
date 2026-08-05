'use client'

import { useMemo, type MouseEvent } from 'react'
import CarouselHero from '@/components/heros/CarouselHero/CarouselHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

export type HeroMapHybridProps = {
  onDownloadCta: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
}

export default function HeroMapHybrid({ onDownloadCta }: HeroMapHybridProps) {
  const slides = useMemo(
    (): CarouselHeroSlide[] => [
      {
        title: (
          <>
            Track your progress
            <br />
            on the map.
          </>
        ),
        body: (
          <p>
            In the app, you can see how your visits look on the map. Plus with many filter options.
            (Coming to Web in 2027)
          </p>
        ),
        ctas: [{ label: 'Download Now', onClick: onDownloadCta }],
        media: HOME_TEST_MEDIA,
        mediaFit: HOME_SQUARE_MEDIA_FIT,
        mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
        autoPlayMs: 16_000
      },
      {
        title: (
          <>
            Explore the full network
            <br />
            on the map
          </>
        ),
        body: (
          <p>
            On the website, browse every station and SuperTram stop, including a interactive
            timeline of the evoultion of the SuperTram.
          </p>
        ),
        ctas: [{ label: 'Open Map', href: '/stations/map', target: '_self' }],
        media: HOME_TEST_MEDIA,
        mediaFit: HOME_SQUARE_MEDIA_FIT,
        mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
        autoPlayMs: 16_000
      }
    ],
    [onDownloadCta]
  )

  return (
    <div className="home-page__hero-row">
      <CarouselHero
        slides={slides}
        ariaLabel="Map progress and network exploration"
        contentFill="heroTint"
        textStyle="splash"
        titleHeadingLevel={2}
        pauseOnHover={false}
        pauseOnFocusWithin={false}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
