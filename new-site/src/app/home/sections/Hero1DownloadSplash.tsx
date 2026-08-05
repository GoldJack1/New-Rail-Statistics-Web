'use client'

import { useMemo, type MouseEvent } from 'react'
import StaticHero from '@/components/heros/StaticHero/StaticHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { preventSingleWordWidow } from '@/utils/textWidow'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

export type Hero1DownloadSplashProps = {
  onDownloadCta: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
}

export default function Hero1DownloadSplash({ onDownloadCta }: Hero1DownloadSplashProps) {
  const slide = useMemo(
    (): CarouselHeroSlide => ({
      title: 'The most comprehensive Station Datebase is here!',
      body: (
        <p>
          {preventSingleWordWidow(
            'View data for all mainline stations in the UK & Ireland, and all Tram Stops in Sheffield.'
          )}
        </p>
      ),
      ctas: [
        { label: 'Download Now', onClick: onDownloadCta },
        { label: 'View Stations', href: '/stations', target: '_self', colorVariant: 'primary' }
      ],
      media: HOME_TEST_MEDIA,
      mediaFit: HOME_SQUARE_MEDIA_FIT,
      mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS
    }),
    [onDownloadCta]
  )

  return (
    <div className="home-page__top-static-hero">
      <StaticHero
        slide={slide}
        ariaLabel="Download Rail Statistics"
        textStyle="splash"
        desktopContentVerticalAlign="center"
        titleHeadingLevel={1}
        imageLoading="eager"
        mediaFit={HOME_SQUARE_MEDIA_FIT}
        mobileTabletUncroppedSettings={HOME_SQUARE_MEDIA_DEFAULTS}
      />
    </div>
  )
}
