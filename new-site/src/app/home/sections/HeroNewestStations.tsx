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
        title="The newest stations on the network!"
        body={
          <>
            <p>
              When a station or tram stop opens on National Rail, Irish Rail, NI Translink and South
              Yorkshire SuperTram, it is added to Rail Statistics automatically from the arrival of
              the first service.
            </p>
            <p>
              So you can start tracking it right away, and no-more opening day searching for the
              right details to add a station, meaning theres more time to explore the new station!
            </p>
          </>
        }
        items={ITEMS}
        ariaLabel="Newest stations and tram stops"
      />
    </div>
  )
}
