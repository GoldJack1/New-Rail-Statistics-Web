import { describe, expect, it } from 'vitest'
import {
  formatStationDetailsHeaderSubtitle,
  getStationDetailsHeaderToc,
} from './formatStationDetailsHeader'

describe('getStationDetailsHeaderToc', () => {
  it('returns SY Supertram for Supertram stops', () => {
    expect(
      getStationDetailsHeaderToc({
        toc: 'Something else',
        sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
      })
    ).toBe('SY Supertram')
  })

  it('returns the station TOC for other networks', () => {
    expect(
      getStationDetailsHeaderToc({
        toc: 'Northern',
        sourceCollectionId: 'stations_gbnr',
      })
    ).toBe('Northern')
  })
})

describe('formatStationDetailsHeaderSubtitle', () => {
  it('joins TOC and locale', () => {
    expect(
      formatStationDetailsHeaderSubtitle({
        toc: 'Northern',
        borough: 'Bury',
        county: 'Greater Manchester',
        country: 'England',
        sourceCollectionId: 'stations_gbnr',
      })
    ).toBe('Northern, Bury, Greater Manchester, England')
  })

  it('formats Supertram with fixed TOC and locale', () => {
    expect(
      formatStationDetailsHeaderSubtitle({
        toc: null,
        borough: 'Sheffield',
        county: 'South Yorkshire',
        country: 'England',
        sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
      })
    ).toBe('SY Supertram, Sheffield, South Yorkshire, England')
  })

  it('omits empty TOC and keeps locale', () => {
    expect(
      formatStationDetailsHeaderSubtitle({
        toc: null,
        county: 'North Yorkshire',
        country: 'England',
        sourceCollectionId: 'stations_gbnr',
      })
    ).toBe('North Yorkshire, England')
  })

  it('appends pending suffix when provided', () => {
    expect(
      formatStationDetailsHeaderSubtitle(
        {
          toc: 'Northern',
          county: 'Greater Manchester',
          country: 'England',
          sourceCollectionId: 'stations_gbnr',
        },
        { pendingSuffix: 'Unpublished changes' }
      )
    ).toBe('Northern, Greater Manchester, England · Unpublished changes')
  })
})
