'use client'

import NewestStationsHero, {
  type NewestStationsHeroItem,
} from '@/components/heros/NewestStationsHero/NewestStationsHero'
import { FEATURED_UPCOMING_STATIONS } from '@/constants/featuredUpcomingStations'

const ITEMS: NewestStationsHeroItem[] = FEATURED_UPCOMING_STATIONS.map((station) => ({
  label: 'Upcoming station',
  station,
  datePrefix: 'EXPECTED',
  interactive: false,
}))

export default function HeroUpcomingStations() {
  return (
    <div className="home-page__hero-row">
      <NewestStationsHero
        title="Stations expected to open soon!"
        body={
          <p>
            Explore stations planned to join the network soon. Opening dates may change as
            projects progress.
          </p>
        }
        items={ITEMS}
        ariaLabel="Stations expected to open soon"
      />
    </div>
  )
}
