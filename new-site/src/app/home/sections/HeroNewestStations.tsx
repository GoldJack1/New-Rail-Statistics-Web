'use client'

import NewestStationsHero, {
  type NewestStationsHeroItem,
} from '@/components/heros/NewestStationsHero/NewestStationsHero'
import {
  FEATURED_NEWEST_MAINLINE_STATION,
  FEATURED_NEWEST_TRAM_STOP,
} from '@/constants/featuredNewestStations'

const ITEMS: NewestStationsHeroItem[] = [
  { label: 'Newest station', station: FEATURED_NEWEST_MAINLINE_STATION },
  { label: 'Newest tram stop', station: FEATURED_NEWEST_TRAM_STOP },
]

export default function HeroNewestStations() {
  return (
    <div className="home-page__hero-row">
      <NewestStationsHero
        title="The newest stations, already in the database"
        body={
          <p>
            When a station or tram stop opens across GB National Rail, Irish Rail, NI Translink
            and South Yorkshire SuperTram, it is added to Rail Statistics so you can start
            tracking it right away.
          </p>
        }
        items={ITEMS}
        ariaLabel="Newest stations and tram stops"
      />
    </div>
  )
}
