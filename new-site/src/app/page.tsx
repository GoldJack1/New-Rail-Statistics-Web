'use client'

import { useCallback, useState } from 'react'
import './home.css'
import HomeDownloadPlatformModal from '@/components/models/HomeDownloadPlatformModal/HomeDownloadPlatformModal'
import { resolveAppDownloadAction } from '@/utils/appDownload'
import Hero1DownloadSplash from './home/sections/Hero1DownloadSplash'
import Hero2TopFeatures from './home/sections/Hero2TopFeatures'
import Hero3StationDetail from './home/sections/Hero3StationDetail'
import Hero4Favourites from './home/sections/Hero4Favourites'
import Hero5SearchFilter from './home/sections/Hero5SearchFilter'
import Hero6VisitTracking from './home/sections/Hero6VisitTracking'
import Hero7Subscription from './home/sections/Hero7Subscription'
import Hero8ClosingDownload from './home/sections/Hero8ClosingDownload'
import Hero9Migrate from './home/sections/Hero9Migrate'
import HeroNewestStations from './home/sections/HeroNewestStations'

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

  return (
    <div className="container">
      <div className="main">
        <Hero1DownloadSplash onDownloadCta={onDownloadCta} />

        <HomeDownloadPlatformModal open={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />

        <Hero2TopFeatures />
        <HeroNewestStations />
        <Hero3StationDetail />
        <Hero4Favourites />
        <Hero5SearchFilter />
        <Hero6VisitTracking />
        <Hero7Subscription />
        <Hero8ClosingDownload onDownloadCta={onDownloadCta} />
        <Hero9Migrate />
      </div>
    </div>
  )
}
