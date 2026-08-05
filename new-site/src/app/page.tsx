'use client'

import { useCallback, useMemo, useState } from 'react'
import './home.css'
import CarouselHero, { type CarouselHeroSlide } from '@/components/heros/CarouselHero/CarouselHero'
import HomeDownloadPlatformModal from '@/components/models/HomeDownloadPlatformModal/HomeDownloadPlatformModal'
import StaticHero from '@/components/heros/StaticHero/StaticHero'
import { preventSingleWordWidow } from '@/utils/textWidow'
import { resolveAppDownloadAction } from '@/utils/appDownload'

const HOME_PRIMARY_SUBTITLE =
  "View data for all mainline stations in the UK & Ireland, and all Light Rail stations in Sheffield."

/** Transparent PNG-style art, so the same file serves both themes. */
const HOME_PRIMARY_HERO1_IMAGE_SOURCES = {
  darkDesktopTablet: '/media/home/hero1/slide1/hero.webp',
  darkMobile: '/media/home/hero1/slide1/hero.webp',
  lightDesktopTablet: '/media/home/hero1/slide1/hero.webp',
  lightMobile: '/media/home/hero1/slide1/hero.webp'
} as const

const HOME_PRIMARY_HERO8_VIDEO_SOURCES = {
  light: '/media/home/hero8/slide1/light.webm',
  dark: '/media/home/hero8/slide1/dark.webm'
} as const

const HOME_PRIMARY_HERO9_VIDEO_SOURCES = {
  light: '/media/home/hero9/slide 1/desktop/desktoplight.webm',
  dark: '/media/home/hero9/slide 1/desktop/desktopdark.webm',
  lightMobileTablet: '/media/home/hero9/slide 1/tablet-mobile/mobile-tabletlight.webm',
  darkMobileTablet: '/media/home/hero9/slide 1/tablet-mobile/mobile-tabletdark.webm'
} as const

const HOME_CAROUSEL_TOP_FEATURES_SLIDES: CarouselHeroSlide[] = [
  {
    title: 'A live station database, ready when you are',
    body: (
      <>
      <p>
        Start ticking off stations straight away with a live database built for rail enthusiasts.
        </p>
        <p>
        Whether you are just starting out or already have a long travel history, Rail Statistics is ready to grow with your journeys.
      </p>
      </>
    ),
    videoSources: {
      light: '/media/home/hero2/slide1/light.webm',
      dark: '/media/home/hero2/slide1/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 80,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 21,
      tabletTopPercent: 22
    },
    autoPlayMs: 18_000
  },
  {
    title: 'Bring your existing station list with you',
    body: (
      <>
      <p>
        Already using your own file to keep track of visited stations?
        </p>
        <p>
        You can migrate it to work with the Rail
        Statistics database, making it easier to continue from where you left off.
      </p>
      </>
    ),
    videoSources: {
      light: '/media/home/hero2/slide2/light.webm',
      dark: '/media/home/hero2/slide2/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 80,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 21,
      tabletTopPercent: 22
    },
    autoPlayMs: 18_000
  },
  {
    title: 'Stay updated when new stations open',
    body: (
      <>
      <p>
        Get notifications when new stations open, so there is no need to keep searching for the latest station details yourself.
        </p>
        <p>
        Rail Statistics helps you stay current as the network changes.
      </p>
      </>
    ),
    videoSources: {
      light: '/media/home/hero2/slide3/light.webm',
      dark: '/media/home/hero2/slide3/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 80,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 21,
      tabletTopPercent: 22
    },
    autoPlayMs: 13_000
  },
  {
    title: 'See your progress on the map',
    body: (
      <>
      <p>
        View your station progress on the map and get a clearer picture of how far your travels have taken you.
        </p>
        <p>
        It is a simple and visual way to explore your journey history.
      </p>
      </>
    ),
    videoSources: {
      light: '/media/home/hero2/slide4/light.webm',
      dark: '/media/home/hero2/slide4/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 80,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 21,
      tabletTopPercent: 22
    },
    autoPlayMs: 15_000
  }
]

const HOME_STATIC_STATION_DETAIL: CarouselHeroSlide = {
  title: 'Dive deeper with detailed station pages',
  body: (
    <>
    <p>
      Explore a wide range of station details,
      including yearly station usage figures from the Office of Rail and Road.
      </p>
      <p>
      When new data is released, Rail Statistics is updated
      so you can keep exploring with the latest information.
    </p>
    </>
  ),
  videoSources: {
    light: '/media/home/hero3/slide1/light.webm',
    dark: '/media/home/hero3/slide1/dark.webm'
  },
  mobileTabletMediaMode: 'uncropped',
  mobileTabletUncroppedSettings: {
    scaleSpeed: 3.5,
    maxScale: 1.9,
    mobileMediaWidthPercent: 85,
    tabletMediaWidthPercent: 80,
    imageTopPercent: 20,
    videoTopPercent: 23,
    tabletTopPercent: 25
  }
}

const HOME_STATIC_FAVOURITES: CarouselHeroSlide = {
  title: 'Keep track of the stations you love',
  body: (
    <>
    <p>
      Found a station that stands out to you? Now you can mark it as a favourite to easily find it later. 
      </p>
      <p>
      This is a great way to build your own shortlist of memorable places across the network.
    </p>
    </>
  ),
  videoSources: {
    light: '/media/home/hero4/slide1/light.webm',
    dark: '/media/home/hero4/slide1/dark.webm'
  },
  mobileTabletMediaMode: 'uncropped',
  mobileTabletUncroppedSettings: {
    scaleSpeed: 3.5,
    maxScale: 1.9,
    mobileMediaWidthPercent: 95,
    tabletMediaWidthPercent: 80,
    imageTopPercent: 22,
    videoTopPercent: 26,
    tabletTopPercent: 25
  }
}

const HOME_CAROUSEL_SEARCH_AND_FILTER_SLIDES: CarouselHeroSlide[] = [
  {
    title: 'Search your way',
    body: (
      <>
        <p>
        Find stations in list view or on the map by station name,
        National Rail CRS code, or TIPLOC code.
        </p>
        <p>
        Whether you search casually or know exactly what you are looking for, Rail Statistics helps you get there faster.
      </p>
    </>
    ),
    videoSources: {
      light: '/media/home/hero5/slide1/light.webm',
      dark: '/media/home/hero5/slide1/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 85,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 23,
      tabletTopPercent: 22
    },
    autoPlayMs: 17_000
  },
  {
    title: 'Filter stations with more control',
    body: (
      <>
        <p>
        Use advanced filters to browse stations by country, county, and operator.
        </p>
        <p>
        You can also narrow down stations within Greater London
        by all 33 London boroughs for more detailed exploration.
        </p>
      </>
    ),
    videoSources: {
      light: '/media/home/hero5/slide2/light.webm',
      dark: '/media/home/hero5/slide2/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 85,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 23,
      tabletTopPercent: 22
    },
    autoPlayMs: 44_000
  }
]

const HOME_STATIC_EASY_VISIT_TRACKING: CarouselHeroSlide = {
  title: 'A simple way to remember when you visited',
  body: (
    <>
      <p>
        When you mark a station as visited,
        Rail Statistics automatically adds the current date by default.
      </p>
      <p>
        That makes it easy to keep track of when each visit happened
        as your journey history grows.
      </p>
    </>
  ),
  videoSources: {
    light: '/media/home/hero6/slide1/light.webm',
    dark: '/media/home/hero6/slide1/dark.webm'
  },
  mobileTabletMediaMode: 'uncropped',
  mobileTabletUncroppedSettings: {
    scaleSpeed: 3.5,
    maxScale: 1.9,
    mobileMediaWidthPercent: 85,
    tabletMediaWidthPercent: 70,
    imageTopPercent: 20,
    videoTopPercent: 23,
    tabletTopPercent: 25
  }
}

const HOME_CAROUSEL_SUBSCRIPTION_SLIDES: CarouselHeroSlide[] = [
  {
    title: 'Enjoy an ad-free experience',
    body: (
      <>
        <p>
          Included with Standard Premium and First Class,
          an ad-free experience lets you focus fully on tracking your
          journeys without distractions.
        </p>
      </>
    ),
    videoSources: {
      light: '/media/home/hero7/slide1/light.webm',
      dark: '/media/home/hero7/slide1/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 85,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 22,
      tabletTopPercent: 23
    },
    autoPlayMs: 15_000
  },
  {
    title: 'Unlock home-screen widgets',
    body: (
      <>
        <p>
          Included with Standard Premium and First Class,
          home-screen widgets make it easy to keep your station visit
          progress visible at a glance every day.
        </p>
      </>
    ),
    videoSources: {
      light: '/media/home/hero7/slide2/light.webm',
      dark: '/media/home/hero7/slide2/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 85,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 22,
      tabletTopPercent: 23
    },
    autoPlayMs: 15_000
  },
  {
    title: 'Be first to try ticket tracking in beta',
    body: (
      <>
        <p>
          Exclusive to First Class, be the first to try Ticket Tracking in beta when it launches in beta in summer 2026.
        </p>
      </>
    ),
    videoSources: {
      light: '/media/home/hero7/slide3/light.webm',
      dark: '/media/home/hero7/slide3/dark.webm'
    },
    mobileTabletMediaMode: 'uncropped',
    mobileTabletUncroppedSettings: {
      scaleSpeed: 3.5,
      maxScale: 1.9,
      mobileMediaWidthPercent: 85,
      tabletMediaWidthPercent: 70,
      imageTopPercent: 20,
      videoTopPercent: 22,
      tabletTopPercent: 23
    },
    autoPlayMs: 15_000
  }
]

export default function HomePage() {
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)

  const onDownloadCta = useCallback(() => {
    const action = resolveAppDownloadAction()
    if (action.type === 'redirect') {
      window.location.href = action.url
      return
    }
    setDownloadModalOpen(true)
  }, [])

  const homePrimaryHero1Slide = useMemo(
    (): CarouselHeroSlide => ({
      title: 'The most comprehensive Station Datebase is Here!',
      body: <p>{preventSingleWordWidow(HOME_PRIMARY_SUBTITLE)}</p>,
      ctas: [
        { label: 'Download Now', onClick: onDownloadCta },
        { label: 'View Stations', href: '/stations', target: '_self', colorVariant: 'primary' }
      ],
      imageSources: HOME_PRIMARY_HERO1_IMAGE_SOURCES,
      mobileTabletMediaMode: 'uncropped',
      mobileTabletUncroppedSettings: {
        scaleSpeed: 3.5,
        maxScale: 1.9,
        mobileMediaWidthPercent: 30,
        tabletMediaWidthPercent: 70,
        imageTopPercent: 20,
        tabletTopPercent: 25
      }
    }),
    [onDownloadCta]
  )

  const homePrimaryHero8Slide = useMemo(
    (): CarouselHeroSlide => ({
      title: 'The Ultimate Station Bashing App is Here!',
      body: <p>{preventSingleWordWidow(HOME_PRIMARY_SUBTITLE)}</p>,
      ctas: [{ label: 'Download Now', onClick: onDownloadCta }],
      videoSources: HOME_PRIMARY_HERO8_VIDEO_SOURCES
    }),
    [onDownloadCta]
  )

  const homePrimaryHero9Slide = useMemo(
    (): CarouselHeroSlide => ({
      title: 'Have a spreadsheet file already?',
      body: (
        <p>If you have a spreadsheet file already, click migrate below to get started on migrating your file to Rail Statistics!</p>
      ),
      ctas: [{ label: 'Migrate', href: '/migration', target: '_self' }],
      videoSources: HOME_PRIMARY_HERO9_VIDEO_SOURCES,
      mobileTabletMediaMode: 'uncropped',
      mobileTabletUncroppedSettings: {
        scaleSpeed: 3.5,
        maxScale: 1.9,
        mobileMediaWidthPercent: 95,
        tabletMediaWidthPercent: 95,
        imageTopPercent: 20,
        videoTopPercent: 24,
        tabletTopPercent: 27
      }
    }),
    []
  )

  return (
    <div className="container">
      <div className="main">
          {/* Hero 1: Primary download splash */}
        <div className="home-page__top-static-hero">
          <StaticHero
            slide={homePrimaryHero1Slide}
            ariaLabel="Download Rail Statistics"
            textStyle="splash"
            desktopContentVerticalAlign="center"
            titleHeadingLevel={1}
            imageLoading="eager"
          />
        </div>

        <HomeDownloadPlatformModal open={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />

        {/* Hero 2: Top features carousel */}
        <div className="home-page__hero-row">
          <CarouselHero
            slides={HOME_CAROUSEL_TOP_FEATURES_SLIDES}
            ariaLabel="Top features"
            titleHeadingLevel={2}
            pauseOnHover={false}
            pauseOnFocusWithin={false}
          />
        </div>

        {/* Hero 3: Detailed station pages */}
        <div className="home-page__hero-row">
          <StaticHero
            slide={HOME_STATIC_STATION_DETAIL}
            ariaLabel="Detailed station pages"
            desktopContentVerticalAlign="center"
            desktopPanelSide="right"
            titleHeadingLevel={2}
          />
        </div>

        {/* Hero 4: Favourite stations */}
        <div className="home-page__hero-row">
          <StaticHero
            slide={HOME_STATIC_FAVOURITES}
            ariaLabel="Favourite stations"
            className="home-page__hero-favourites-mobile-image-bottom"
            contentFill="heroTint"
            desktopContentVerticalAlign="center"
            desktopPanelSide="right"
            mobilePanelPosition="bottom"
            titleHeadingLevel={2}
          />
        </div>

        {/* Hero 5: Search and filtering carousel */}
        <div className="home-page__hero-row">
          <CarouselHero
            slides={HOME_CAROUSEL_SEARCH_AND_FILTER_SLIDES}
            ariaLabel="Search and filtering options"
            titleHeadingLevel={2}
            pauseOnHover={false}
            pauseOnFocusWithin={false}
          />
        </div>

        {/* Hero 6: Easy visit tracking */}
        <div className="home-page__hero-row">
          <StaticHero
            slide={HOME_STATIC_EASY_VISIT_TRACKING}
            ariaLabel="Easy visit tracking"
            desktopContentVerticalAlign="center"
            desktopPanelSide="right"
            titleHeadingLevel={2}
          />
        </div>

        {/* Hero 7: Subscription features carousel */}
        <div className="home-page__hero-row">
          <CarouselHero
            slides={HOME_CAROUSEL_SUBSCRIPTION_SLIDES}
            ariaLabel="Subscription features"
            titleHeadingLevel={2}
            pauseOnHover={false}
            pauseOnFocusWithin={false}
          />
        </div>

        {/* Hero 8: Closing download splash */}
        <div className="home-page__hero-row">
          <StaticHero
            slide={homePrimaryHero8Slide}
            ariaLabel="Download Rail Statistics"
            contentFill="heroTint"
            textStyle="splash"
            desktopContentVerticalAlign="center"
            titleHeadingLevel={2}
          />
        </div>

        {/* Hero 9: Migrate your file */}
        <div className="home-page__hero-row">
          <StaticHero
            slide={homePrimaryHero9Slide}
            ariaLabel="Migrate your file to Rail Statistics"
            contentFill="heroTint"
            textStyle="splash"
            desktopContentVerticalAlign="center"
            titleHeadingLevel={2}
          />
        </div>
      </div>
    </div>
  )
}
