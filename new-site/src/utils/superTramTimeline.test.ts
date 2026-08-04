import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import {
  buildSuperTramTimelineSteps,
  countStationsVisibleAtTimelineCutoff,
  getTimelineVisibleStationIds,
  isStationEligibleForOpeningTimeline,
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
  it('requires both date opened and order of opening for timeline steps', () => {
    expect(
      isStationEligibleForOpeningTimeline(
        baseStation({ dateOpened: '21/03/1994', orderOfOpening: '1' })
      )
    ).toBe(true)
    expect(
      isStationEligibleForOpeningTimeline(baseStation({ dateOpened: '21/03/1994' }))
    ).toBe(false)
    expect(isStationEligibleForOpeningTimeline(baseStation({ orderOfOpening: '1' }))).toBe(false)
    expect(
      isStationEligibleForOpeningTimeline(
        baseStation({ dateOpened: '21/03/1994', orderOfOpening: '19940321' })
      )
    ).toBe(false)
  })

  it('starts with a day-before prologue so the first openings can animate in', () => {
    const stations = [
      baseStation({ id: 'a', dateOpened: '22/08/1994', orderOfOpening: '2' }),
      baseStation({ id: 'b', dateOpened: '21/03/1994', orderOfOpening: '1' }),
      baseStation({ id: 'c', dateOpened: '21/03/1994', orderOfOpening: '2' }),
    ]

    const steps = buildSuperTramTimelineSteps(stations)
    expect(steps).toHaveLength(4)
    expect(steps[0].label).toBe('20 Mar 1994')
    expect(steps.map((step) => step.cutoff.stationId)).toEqual([null, 'b', 'c', 'a'])
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[0].cutoff, false)).toBe(0)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[1].cutoff, false)).toBe(1)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[2].cutoff, false)).toBe(2)
  })

  it('steps through same-day stops in order-of-opening sequence', () => {
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
  })

  it('orders by date first; order of opening only breaks ties within a date', () => {
    const stations = [
      baseStation({ id: 'later-date-lower-order', dateOpened: '22/08/1994', orderOfOpening: 1 }),
      baseStation({ id: 'earlier-date-higher-order', dateOpened: '21/03/1994', orderOfOpening: 9 }),
    ]

    const steps = buildSuperTramTimelineSteps(stations)
    expect(steps.map((step) => step.cutoff.stationId)).toEqual([
      null,
      'earlier-date-higher-order',
      'later-date-lower-order',
    ])
  })

  it('omits stops missing date or order; incomplete stops only appear at max', () => {
    const ordered = baseStation({
      id: 'a',
      dateOpened: '22/08/1994',
      orderOfOpening: 1,
    })
    const missingOrder = baseStation({ id: 'b', dateOpened: '21/03/1994' })
    const missingDate = baseStation({ id: 'c', orderOfOpening: 2 })
    const legacyDateOrder = baseStation({
      id: 'd',
      dateOpened: '22/08/1994',
      orderOfOpening: '19940822',
    })

    const steps = buildSuperTramTimelineSteps([
      ordered,
      missingOrder,
      missingDate,
      legacyDateOrder,
    ])

    expect(steps.map((step) => step.cutoff.stationId)).toEqual([null, 'a'])
    expect(isStationVisibleAtTimelineCutoff(missingOrder, steps[1].cutoff, false)).toBe(false)
    expect(isStationVisibleAtTimelineCutoff(missingOrder, steps[1].cutoff, true)).toBe(true)
    expect(isStationVisibleAtTimelineCutoff(legacyDateOrder, steps[1].cutoff, false)).toBe(false)
    expect(isStationVisibleAtTimelineCutoff(legacyDateOrder, steps[1].cutoff, true)).toBe(true)
  })

  it('orders seven same-day stops strictly by order of opening 1…7', () => {
    const stations = [
      baseStation({
        id: '0001',
        stationName: 'Arbourthorne Road',
        dateOpened: '22/08/1994',
        orderOfOpening: '4',
      }),
      baseStation({
        id: '0002',
        stationName: 'Arena/Olympic Legacy Park',
        dateOpened: '22/08/1994',
        orderOfOpening: '7',
      }),
      baseStation({
        id: '0003',
        stationName: 'Attercliffe',
        dateOpened: '22/08/1994',
        orderOfOpening: '6',
      }),
      baseStation({
        id: '0017',
        stationName: 'Granville Road/The Sheffield College',
        dateOpened: '22/08/1994',
        orderOfOpening: '2',
      }),
      baseStation({
        id: '0038',
        stationName: 'Park Grange',
        dateOpened: '22/08/1994',
        orderOfOpening: '3',
      }),
      baseStation({
        id: '0043',
        stationName: 'Sheffield Station for Sheffield Hallam University',
        dateOpened: '22/08/1994',
        orderOfOpening: '1',
      }),
      baseStation({
        id: '0044',
        stationName: 'Spring Lane',
        dateOpened: '22/08/1994',
        orderOfOpening: '5',
      }),
    ]

    const steps = buildSuperTramTimelineSteps(stations)
    expect(steps.slice(1).map((step) => step.cutoff.order)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(steps.slice(1).map((step) => step.cutoff.stationId)).toEqual([
      '0043',
      '0017',
      '0038',
      '0001',
      '0044',
      '0003',
      '0002',
    ])

    const visibleAtThird = getTimelineVisibleStationIds(steps, 3)
    expect([...visibleAtThird]).toEqual(['0043', '0017', '0038'])
  })

  it('excludes legacy YYYYMMDD date-default order values from the timeline', () => {
    const stations = [
      baseStation({ id: 'b', dateOpened: '21/03/1994', orderOfOpening: '19940321' }),
      baseStation({ id: 'a', dateOpened: '21/03/1994', orderOfOpening: '1' }),
    ]
    const steps = buildSuperTramTimelineSteps(stations)
    expect(steps.map((step) => step.cutoff.stationId)).toEqual([null, 'a'])
    expect(steps[1].cutoff.order).toBe(1)
  })

  it('derives a shared YYYYMMDD order value from date opened', () => {
    expect(orderOfOpeningFromDateOpened('21/03/1994')).toBe('19940321')
    expect(orderOfOpeningFromDateOpened('22/08/1994')).toBe('19940822')
    expect(orderOfOpeningFromDateOpened('')).toBe('')
  })

  it('hides incomplete stops until the timeline reaches the end', () => {
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
