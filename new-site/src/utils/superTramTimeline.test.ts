import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import {
  buildSuperTramTimelineSteps,
  countStationsVisibleAtTimelineCutoff,
  isStationVisibleAtTimelineCutoff,
  orderOfOpeningFromDateOpened,
} from './superTramTimeline'

function baseStation(overrides: Partial<Station> = {}): Station {
  return {
    id: '1',
    stationName: 'Test Stop',
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
    ...overrides,
  }
}

describe('superTramTimeline', () => {
  it('starts with a day-before prologue so the first openings can animate in', () => {
    const stations = [
      baseStation({ id: 'a', dateOpened: '22/08/1994', orderOfOpening: '19940822' }),
      baseStation({ id: 'b', dateOpened: '21/03/1994', orderOfOpening: '19940321' }),
      baseStation({ id: 'c', dateOpened: '21/03/1994', orderOfOpening: '19940321' }),
    ]

    const steps = buildSuperTramTimelineSteps(stations)
    // Prologue + one step per stop (same-day shared order still splits by station).
    expect(steps).toHaveLength(4)
    expect(steps[0].label).toBe('20 Mar 1994')
    expect(steps[1].label).toBe('21 Mar 1994')
    expect(steps[2].label).toBe('21 Mar 1994')
    expect(steps[3].label).toBe('22 Aug 1994')
    expect(steps.map((step) => step.cutoff.stationId)).toEqual([null, 'b', 'c', 'a'])
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[0].cutoff, false)).toBe(0)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[1].cutoff, false)).toBe(1)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[2].cutoff, false)).toBe(2)
  })

  it('steps through stops in order-of-opening sequence', () => {
    const stations = [
      baseStation({ id: 'c', dateOpened: '21/03/1994', orderOfOpening: 3 }),
      baseStation({ id: 'a', dateOpened: '21/03/1994', orderOfOpening: 1 }),
      baseStation({ id: 'b', dateOpened: '21/03/1994', orderOfOpening: 2 }),
      baseStation({ id: 'd', dateOpened: '22/08/1994', orderOfOpening: 4 }),
    ]

    const steps = buildSuperTramTimelineSteps(stations)
    expect(steps.map((step) => step.cutoff.order)).toEqual([
      Number.NEGATIVE_INFINITY,
      1,
      2,
      3,
      4,
    ])
    expect(steps.map((step) => step.cutoff.stationId)).toEqual([null, 'a', 'b', 'c', 'd'])
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[0].cutoff, false)).toBe(0)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[1].cutoff, false)).toBe(1)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[2].cutoff, false)).toBe(2)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[3].cutoff, false)).toBe(3)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[4].cutoff, true)).toBe(4)
  })

  it('follows order of opening even when dates disagree', () => {
    const stations = [
      baseStation({ id: 'later-date-lower-order', dateOpened: '22/08/1994', orderOfOpening: 1 }),
      baseStation({ id: 'earlier-date-higher-order', dateOpened: '21/03/1994', orderOfOpening: 9 }),
    ]

    const steps = buildSuperTramTimelineSteps(stations)
    expect(steps.map((step) => step.cutoff.stationId)).toEqual([
      null,
      'later-date-lower-order',
      'earlier-date-higher-order',
    ])
    expect(steps.map((step) => step.label)).toEqual(['20 Mar 1994', '22 Aug 1994', '21 Mar 1994'])
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[0].cutoff, false)).toBe(0)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[1].cutoff, false)).toBe(1)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[2].cutoff, false)).toBe(2)
  })

  it('opens stops without an order after all ordered stops, by date', () => {
    const orderedLate = baseStation({
      id: 'a',
      dateOpened: '22/08/1994',
      orderOfOpening: 1,
    })
    const unorderedEarly = baseStation({ id: 'b', dateOpened: '21/03/1994' })
    const unorderedLater = baseStation({ id: 'c', dateOpened: '18/02/1995' })
    const steps = buildSuperTramTimelineSteps([orderedLate, unorderedEarly, unorderedLater])

    expect(steps.map((step) => step.cutoff.stationId)).toEqual([null, 'a', 'b', 'c'])
    expect(isStationVisibleAtTimelineCutoff(unorderedEarly, steps[1].cutoff, false)).toBe(false)
    expect(isStationVisibleAtTimelineCutoff(unorderedEarly, steps[2].cutoff, false)).toBe(true)
    expect(isStationVisibleAtTimelineCutoff(unorderedLater, steps[2].cutoff, false)).toBe(false)
    expect(isStationVisibleAtTimelineCutoff(unorderedLater, steps[3].cutoff, false)).toBe(true)
  })

  it('derives a shared YYYYMMDD order value from date opened', () => {
    expect(orderOfOpeningFromDateOpened('21/03/1994')).toBe('19940321')
    expect(orderOfOpeningFromDateOpened('22/08/1994')).toBe('19940822')
    expect(orderOfOpeningFromDateOpened('')).toBe('')
  })

  it('shows only stops opened on or before the cutoff', () => {
    const stations = [
      baseStation({ id: 'a', dateOpened: '21/03/1994' }),
      baseStation({ id: 'b', dateOpened: '22/08/1994' }),
    ]
    const steps = buildSuperTramTimelineSteps(stations)

    expect(countStationsVisibleAtTimelineCutoff(stations, steps[0].cutoff, false)).toBe(0)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[1].cutoff, false)).toBe(1)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[2].cutoff, true)).toBe(2)
  })

  it('hides undated stops until the timeline reaches the end', () => {
    const station = baseStation({ id: 'a', dateOpened: '' })
    const cutoff = {
      dateMs: Date.UTC(1994, 2, 21),
      order: Number.NEGATIVE_INFINITY,
      stationId: null,
    }
    expect(isStationVisibleAtTimelineCutoff(station, cutoff, false)).toBe(false)
    expect(isStationVisibleAtTimelineCutoff(station, cutoff, true)).toBe(true)
  })
})
