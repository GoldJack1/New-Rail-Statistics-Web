import type { Station } from '@/types'

/**
 * Temporary records for the homepage "expected to open" hero.
 *
 * Replace these with confirmed station data when it is available. Keep `dateOpened`
 * in dd/mm/yyyy format. Placeholder cards are deliberately non-interactive.
 */
function createPlaceholderStation(
  id: string,
  stationName: string,
  dateOpened: string
): Station {
  return {
    id,
    stationName,
    crsCode: '',
    tiploc: null,
    latitude: 0,
    longitude: 0,
    country: 'Location TBC',
    county: null,
    borough: null,
    toc: 'Operator TBC',
    stnarea: 'GBNR',
    sourceCollectionId: 'stations_gbnr',
    dateOpened,
    yearlyPassengers: null,
  }
}

export const FEATURED_UPCOMING_STATIONS: Station[] = [
  createPlaceholderStation('upcoming-1', 'Example Station One', '01/01/2027'),
  createPlaceholderStation('upcoming-2', 'Example Station Two', '01/04/2027'),
  createPlaceholderStation('upcoming-3', 'Example Station Three', '01/07/2027'),
  createPlaceholderStation('upcoming-4', 'Example Station Four', '01/10/2027'),
]
