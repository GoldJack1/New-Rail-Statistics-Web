import { describe, expect, it } from 'vitest'
import type { PendingChangeEntry } from '../contexts/pendingStationChangesTypes'
import type { Station } from '../types'
import { mergePendingNewStationsForMap } from './pendingMapStations'
import { buildSuperTramTimelineSteps } from './superTramTimeline'

function superTramStop(id: string, overrides: Partial<Station> = {}): Station {
  return {
    id,
    stationName: `Stop ${id}`,
    crsCode: '',
    tiploc: null,
    latitude: 53.4,
    longitude: -1.4,
    country: 'England',
    county: 'South Yorkshire',
    toc: null,
    stnarea: 'GBSHEFFSUPERTRAM',
    yearlyPassengers: null,
    sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
    dateOpened: '21/03/1994',
    ...overrides,
  }
}

function pendingOrderEdit(station: Station, order: string): PendingChangeEntry {
  return {
    targetCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
    original: station,
    updated: {},
    sandboxUpdated: { 'Order of Opening': order },
  }
}

describe('mergePendingNewStationsForMap', () => {
  it('applies unpublished order of opening so the timeline can step through same-day stops', () => {
    const a = superTramStop('a')
    const b = superTramStop('b')

    const { stations } = mergePendingNewStationsForMap(
      [a, b],
      { a: pendingOrderEdit(a, '1'), b: pendingOrderEdit(b, '2') },
      'lightrail_GBSHEFFSUPERTRAM'
    )

    expect(stations.map((station) => station.orderOfOpening)).toEqual(['1', '2'])
    // Prologue step plus one step per ordered stop.
    expect(buildSuperTramTimelineSteps(stations)).toHaveLength(3)
  })

  it('applies unpublished date opened', () => {
    const a = superTramStop('a')

    const { stations } = mergePendingNewStationsForMap(
      [a],
      {
        a: {
          targetCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
          original: a,
          updated: {},
          sandboxUpdated: { 'Date Opened': '18/02/1995' },
        },
      },
      'lightrail_GBSHEFFSUPERTRAM'
    )

    expect(stations[0].dateOpened).toBe('18/02/1995')
  })

  it('leaves stations untouched when the pending entry has no timeline fields', () => {
    const a = superTramStop('a', { orderOfOpening: '3' })

    const { stations } = mergePendingNewStationsForMap(
      [a],
      {
        a: {
          targetCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
          original: a,
          updated: { stationName: 'Renamed' },
          sandboxUpdated: { urlSlug: 'renamed' },
        },
      },
      'lightrail_GBSHEFFSUPERTRAM'
    )

    expect(stations[0].orderOfOpening).toBe('3')
    expect(stations[0].dateOpened).toBe('21/03/1994')
  })
})
