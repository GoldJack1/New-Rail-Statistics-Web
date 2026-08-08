'use client'

import { useMemo, type MouseEvent } from 'react'
import StaticHero from '@/components/heros/StaticHero/StaticHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_HERO_CLOSING_MEDIA } from '../homeHeroMedia'

export type Hero8ClosingDownloadProps = {
  onDownloadCta: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
}

export default function Hero8ClosingDownload({ onDownloadCta }: Hero8ClosingDownloadProps) {
  const slide = useMemo(
    (): CarouselHeroSlide => ({
      title: 'The ultimate station-bashing app is here',
      body: (
        <p>
          Live station and tram data for the UK & Ireland, visit tracking on the go, and deeper
          detail on the website whenever you need it.
        </p>
      ),
      ctas: [{ label: 'Download Now', onClick: onDownloadCta }],
      media: HOME_HERO_CLOSING_MEDIA,
      mediaFit: HOME_SQUARE_MEDIA_FIT,
      mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS
    }),
    [onDownloadCta]
  )

  return (
    <div className="home-page__hero-row">
      <StaticHero
        slide={slide}
        ariaLabel="Download Rail Statistics"
        contentFill="heroTint"
        textStyle="splash"
        desktopContentVerticalAlign="center"
        titleHeadingLevel={2}
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
