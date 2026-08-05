'use client'

import { useMemo, type MouseEvent } from 'react'
import StaticHero from '@/components/heros/StaticHero/StaticHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { preventSingleWordWidow } from '@/utils/textWidow'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

export type Hero8ClosingDownloadProps = {
  onDownloadCta: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
}

export default function Hero8ClosingDownload({ onDownloadCta }: Hero8ClosingDownloadProps) {
  const slide = useMemo(
    (): CarouselHeroSlide => ({
      title: 'The Ultimate Station Bashing App is Here!',
      body: (
        <p>
          {preventSingleWordWidow(
            'View data for all mainline stations in the UK & Ireland, and all Light Rail stations in Sheffield.'
          )}
        </p>
      ),
      ctas: [{ label: 'Download Now', onClick: onDownloadCta }],
      media: HOME_TEST_MEDIA,
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
