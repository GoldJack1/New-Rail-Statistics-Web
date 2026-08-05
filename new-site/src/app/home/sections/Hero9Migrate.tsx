'use client'

import StaticHero from '@/components/heros/StaticHero/StaticHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

const SLIDE: CarouselHeroSlide = {
  title: 'Have a spreadsheet file already?',
  body: (
    <p>
      If you have a spreadsheet file already, click migrate below to get started on migrating your
      file to Rail Statistics!
    </p>
  ),
  ctas: [{ label: 'Migrate', href: '/migration', target: '_self' }],
  media: HOME_TEST_MEDIA,
  mediaFit: HOME_SQUARE_MEDIA_FIT,
  mobileTabletUncroppedSettings: HOME_SQUARE_MEDIA_DEFAULTS
}

export default function Hero9Migrate() {
  return (
    <div className="home-page__hero-row">
      <StaticHero
        slide={SLIDE}
        ariaLabel="Migrate your file to Rail Statistics"
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
