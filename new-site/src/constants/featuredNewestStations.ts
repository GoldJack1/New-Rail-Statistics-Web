import type { Station } from '@/types'

/**
 * Hand-curated snapshots of the newest station and tram stop, rendered by the homepage
 * hero. Held as static records so the marketing homepage never loads the station
 * bundles or hits Firestore.
 *
 * Update both entries by hand when a newer station or stop opens. Field values must
 * match the Firestore document (see the station export bundles) — `stationName`,
 * `urlSlug`, and `sourceCollectionId` decide the detail URL, `country` / `county` /
 * `borough` decide the location line on the card, and `dateOpened` (dd/mm/yyyy) is the
 * opening date shown in the hero caption.
 */

/** GB National Rail id 2598. */
export const FEATURED_NEWEST_MAINLINE_STATION: Station = {
  id: '2598',
  stationName: 'Okehampton Interchange',
  crsCode: 'OKI',
  tiploc: 'OKHMPIC',
  latitude: 50.74343489687478,
  longitude: -3.9759564428719645,
  country: 'England',
  county: 'Devon',
  borough: 'West Devon',
  toc: 'Great Western Railway',
  stnarea: 'GBNR',
  urlSlug: 'okehampton-interchange',
  sourceCollectionId: 'stations_gbnr',
  dateOpened: '01/08/2025',
  yearlyPassengers: null,
}

/** South Yorkshire SuperTram id 0029. */
export const FEATURED_NEWEST_TRAM_STOP: Station = {
  id: '0029',
  stationName: 'Magna',
  crsCode: '',
  tiploc: null,
  latitude: 53.42021077341246,
  longitude: -1.3891160488128664,
  country: 'England',
  county: 'South Yorkshire',
  borough: 'Templeborough',
  toc: null,
  stnarea: 'GBSHEFFSUPERTRAM',
  urlSlug: null,
  sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
  linesServed: 'Tram-Train',
  dateOpened: '09/04/2026',
  orderOfOpening: '1',
  yearlyPassengers: null,
}
