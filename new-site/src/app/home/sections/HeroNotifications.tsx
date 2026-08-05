'use client'

import { useMemo, type MouseEvent } from 'react'
import StaticHero from '@/components/heros/StaticHero/StaticHero'
import type { CarouselHeroSlide } from '@/components/models/heroCarouselSlideModel'
import { HOME_SQUARE_MEDIA_DEFAULTS, HOME_SQUARE_MEDIA_FIT } from '../homeHeroDefaults'
import { HOME_TEST_MEDIA } from '../homeHeroMedia'

export type HeroNotificationsProps = {
  onDownloadCta: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
}

export default function HeroNotifications({ onDownloadCta }: HeroNotificationsProps) {
  const slide = useMemo(
    (): CarouselHeroSlide => ({
      title: 'Get notified when new stations open',
      body: (
        <>
          <p>
            When you download the app you&apos;ll be notified when new stations are added, so you
            don&apos;t have to keep checking for the latest openings yourself.
          </p>
          <p>
            Plus you have acess to in-app messages from us when new station openings are announced
            and verifyed. So no-wondering if it true or not!
          </p>
        </>
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
        ariaLabel="New station notifications"
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
