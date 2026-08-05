'use client'

import NewestStationsHero, {
  type NewestStationsHeroItem,
} from '@/components/heros/NewestStationsHero/NewestStationsHero'
import { FEATURED_UPCOMING_STATIONS } from '@/constants/featuredUpcomingStations'

const ITEMS: NewestStationsHeroItem[] = FEATURED_UPCOMING_STATIONS.map((station) => ({
  station,
  datePrefix: station.openingStatus.toUpperCase(),
  interactive: false,
}))

export default function HeroUpcomingStations() {
  return (
    <div className="home-page__hero-row">
      <NewestStationsHero
        title="New stations expected to open!"
        body={
          <>
            <p>Here’s a showcase of stations expected to open next.</p>
            <p>
              Please note: dates may change as delays occur, and some dates may be withdrawn if plans
              shift.
            </p>
          </>
        }
        items={ITEMS}
        ariaLabel="Stations expected to open soon"
      />
    </div>
  )
}
