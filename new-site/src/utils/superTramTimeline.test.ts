import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import {
  buildSuperTramTimelineSteps,
  countStationsVisibleAtTimelineCutoff,
  getTimelineVisibleStationIds,
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
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[0].cutoff, false)).toBe(0)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[1].cutoff, false)).toBe(1)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[2].cutoff, false)).toBe(2)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[3].cutoff, false)).toBe(3)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[4].cutoff, true)).toBe(4)
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
    expect(steps.map((step) => step.label)).toEqual(['20 Mar 1994', '21 Mar 1994', '22 Aug 1994'])
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[0].cutoff, false)).toBe(0)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[1].cutoff, false)).toBe(1)
    expect(countStationsVisibleAtTimelineCutoff(stations, steps[2].cutoff, false)).toBe(2)
  })

  it('within a date, opens unordered stops after ordered ones; chronology still follows date', () => {
    const orderedLate = baseStation({
      id: 'a',
      dateOpened: '22/08/1994',
      orderOfOpening: 1,
    })
    const unorderedEarly = baseStation({ id: 'b', dateOpened: '21/03/1994' })
    const unorderedLater = baseStation({ id: 'c', dateOpened: '18/02/1995' })
    const unorderedSameDayAsOrdered = baseStation({ id: 'd', dateOpened: '22/08/1994' })
    const steps = buildSuperTramTimelineSteps([
      orderedLate,
      unorderedEarly,
      unorderedLater,
      unorderedSameDayAsOrdered,
    ])

    expect(steps.map((step) => step.cutoff.stationId)).toEqual([null, 'b', 'a', 'd', 'c'])
    expect(isStationVisibleAtTimelineCutoff(unorderedEarly, steps[1].cutoff, false)).toBe(true)
    expect(isStationVisibleAtTimelineCutoff(orderedLate, steps[1].cutoff, false)).toBe(false)
    expect(isStationVisibleAtTimelineCutoff(orderedLate, steps[2].cutoff, false)).toBe(true)
    expect(isStationVisibleAtTimelineCutoff(unorderedSameDayAsOrdered, steps[2].cutoff, false)).toBe(
      false
    )
    expect(isStationVisibleAtTimelineCutoff(unorderedSameDayAsOrdered, steps[3].cutoff, false)).toBe(
      true
    )
    expect(isStationVisibleAtTimelineCutoff(unorderedLater, steps[3].cutoff, false)).toBe(false)
    expect(isStationVisibleAtTimelineCutoff(unorderedLater, steps[4].cutoff, false)).toBe(true)
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

  it('ignores YYYYMMDD date-derived order values for sequencing', () => {
    const stations = [
      baseStation({ id: 'b', dateOpened: '21/03/1994', orderOfOpening: '19940321' }),
      baseStation({ id: 'a', dateOpened: '21/03/1994', orderOfOpening: '1' }),
    ]
    const steps = buildSuperTramTimelineSteps(stations)
    expect(steps.map((step) => step.cutoff.stationId)).toEqual([null, 'a', 'b'])
    expect(steps[1].cutoff.order).toBe(1)
    expect(steps[2].cutoff.order).toBeNull()
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
