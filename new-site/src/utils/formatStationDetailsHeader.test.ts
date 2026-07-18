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
        stnarea: null,
        sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
      })
    ).toBe('SY Supertram')
  })

  it('returns the station TOC for other networks', () => {
    expect(
      getStationDetailsHeaderToc({
        toc: 'Northern',
        stnarea: null,
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
        stnarea: null,
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
        stnarea: null,
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
        stnarea: null,
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
          stnarea: null,
          county: 'Greater Manchester',
          country: 'England',
          sourceCollectionId: 'stations_gbnr',
        },
        { pendingSuffix: 'Unpublished changes' }
      )
    ).toBe('Northern, Greater Manchester, England · Unpublished changes')
  })
})
