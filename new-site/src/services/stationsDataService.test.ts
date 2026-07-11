import { describe, expect, it } from 'vitest'
import type { Station } from '@/types'
import { shouldReplaceFullWithList, stationHasLocaleDetail } from '@/services/stationsDataService'

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
