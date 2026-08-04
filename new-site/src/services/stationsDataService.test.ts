import { describe, expect, it } from 'vitest'
import type { Station } from '@/types'
import {
  lightRailStationsMissingPlatforms,
  shouldReplaceFullWithList,
  stationHasLocaleDetail,
} from '@/services/stationsDataService'

const leanRow = (id: string): Station => ({
  id,
  stationName: 'Test',
  crsCode: 'TST',
  tiploc: null,
  latitude: 51.5,
  longitude: -0.1,
  country: null,
  county: null,
  toc: 'GWR',
  stnarea: 'GBNR',
  borough: null,
  yearlyPassengers: null,
})

const listRow = (id: string): Station => ({
  ...leanRow(id),
  country: 'England',
  county: 'Greater London',
  borough: 'Westminster',
})

const supertramRow = (id: string, overrides: Partial<Station> = {}): Station => ({
  ...leanRow(id),
  stationName: 'Cathedral',
  crsCode: '',
  toc: null,
  stnarea: 'GBSHEFFSUPERTRAM',
  sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
  linesServed: 'Blue, Yellow',
  ...overrides,
})

describe('stationHasLocaleDetail', () => {
  it('detects locale fields on list rows', () => {
    expect(stationHasLocaleDetail(listRow('1'))).toBe(true)
    expect(stationHasLocaleDetail(leanRow('1'))).toBe(false)
  })
})

describe('shouldReplaceFullWithList', () => {
  it('replaces empty full cache with list rows', () => {
    expect(shouldReplaceFullWithList([], [listRow('1')])).toBe(true)
  })

  it('replaces lean full cache when list has locale detail', () => {
    expect(shouldReplaceFullWithList([leanRow('1')], [listRow('1')])).toBe(true)
  })

  it('keeps full cache when it already has locale detail', () => {
    expect(shouldReplaceFullWithList([listRow('1')], [listRow('2')])).toBe(false)
  })
})

describe('lightRailStationsMissingPlatforms', () => {
  it('detects SuperTram list rows that have lines but no platforms', () => {
    expect(lightRailStationsMissingPlatforms([supertramRow('1')])).toBe(true)
  })

  it('returns false when platforms are present', () => {
    expect(
      lightRailStationsMissingPlatforms([supertramRow('1', { platforms: 'A, B' })])
    ).toBe(false)
  })

  it('ignores non-light-rail stations', () => {
    expect(lightRailStationsMissingPlatforms([listRow('1')])).toBe(false)
  })
})
