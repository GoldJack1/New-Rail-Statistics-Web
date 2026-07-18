import { describe, expect, it } from 'vitest'
import {
  formatStationDetailsHeaderManagedBy,
  formatStationDetailsHeaderManagedByToc,
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
  it('returns locale only (TOC is shown above the title)', () => {
    expect(
      formatStationDetailsHeaderSubtitle({
        toc: 'Northern',
        stnarea: null,
        borough: 'Bury',
        county: 'Greater Manchester',
        country: 'England',
        sourceCollectionId: 'stations_gbnr',
      })
    ).toBe('Bury, Greater Manchester, England')
  })

  it('formats Supertram locale without TOC', () => {
    expect(
      formatStationDetailsHeaderSubtitle({
        toc: null,
        stnarea: null,
        borough: 'Sheffield',
        county: 'South Yorkshire',
        country: 'England',
        sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
      })
    ).toBe('Sheffield, South Yorkshire, England')
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
    ).toBe('Greater Manchester, England · Unpublished changes')
  })
})

describe('formatStationDetailsHeaderManagedBy', () => {
  it('formats name with TOC code', () => {
    expect(formatStationDetailsHeaderManagedBy('Elizabeth Line', 'XR')).toBe(
      'Station Managed by: Elizabeth Line (XR)'
    )
  })

  it('formats name without code', () => {
    expect(formatStationDetailsHeaderManagedBy('Northern', null)).toBe(
      'Station Managed by: Northern'
    )
  })
})

describe('formatStationDetailsHeaderManagedByToc', () => {
  it('formats name with TOC code', () => {
    expect(formatStationDetailsHeaderManagedByToc('Elizabeth Line', 'XR')).toBe(
      'Elizabeth Line (XR)'
    )
  })
})
