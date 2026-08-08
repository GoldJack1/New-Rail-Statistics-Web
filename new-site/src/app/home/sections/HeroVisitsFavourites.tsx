'use client'

import { useMemo, type MouseEvent } from 'react'
import CarouselHero from '@/components/heros/CarouselHero/CarouselHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_HERO_8_SLIDES } from '../homeHeroMedia'

export type HeroVisitsFavouritesProps = {
  onDownloadCta: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
}

export default function HeroVisitsFavourites({ onDownloadCta }: HeroVisitsFavouritesProps) {
  const slides = useMemo(
    (): CarouselHeroSlide[] => [
      {
        title: (
          <>
            Remember when
            <br />
            you visited
          </>
        ),
        body: (
          <p>
            Auto date when you mark a station/stop as visited in the app. (There also a option to
            not auto-date)
          </p>
        ),
        ctas: [{ label: 'Download Now', onClick: onDownloadCta }],
        media: HOME_HERO_8_SLIDES[0],
        mediaFit: HOME_SQUARE_MEDIA_FIT,
        mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
        autoPlayMs: 15_000
      },
      {
        title: 'Keep track of the stations/stops you love',
        body: (
          <p>
            No-more forgetting which are you favourites only in the app. (Coming to Web in 2027)
          </p>
        ),
        ctas: [{ label: 'Download Now', onClick: onDownloadCta }],
        media: HOME_HERO_8_SLIDES[1],
        mediaFit: HOME_SQUARE_MEDIA_FIT,
        mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS,
        autoPlayMs: 15_000
      }
    ],
    [onDownloadCta]
  )

  return (
    <div className="home-page__hero-row">
      <CarouselHero
        slides={slides}
        ariaLabel="Visit tracking and favourite stations"
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
