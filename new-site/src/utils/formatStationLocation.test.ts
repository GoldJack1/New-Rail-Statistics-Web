import { describe, expect, it } from 'vitest'
import { formatStationLocaleDisplay, formatStationLocationDisplay } from './formatStationLocation'

describe('formatStationLocationDisplay', () => {
  it('formats Greater London stations with borough', () => {
    expect(
      formatStationLocationDisplay({
        county: 'Greater London',
        borough: 'Westminster',
        country: 'England',
      })
    ).toBe('Westminster, Greater London, England')
  })

  it('formats non-London stations with borough', () => {
    expect(
      formatStationLocationDisplay({
        county: 'South Yorkshire',
        borough: 'Park Hill',
        country: 'England',
      })
    ).toBe('Park Hill, South Yorkshire, England')
  })

  it('falls back to county and country when borough is missing', () => {
    expect(
      formatStationLocationDisplay({
        county: 'North Yorkshire',
        country: 'England',
      })
    ).toBe('North Yorkshire, England')
  })

  it('formats Irish Rail stations with province in the borough slot', () => {
    expect(
      formatStationLocationDisplay({
        province: 'Munster',
        county: 'Cork',
        country: 'Republic of Ireland',
        sourceCollectionId: 'stations_roiirerail',
      })
    ).toBe('Munster, Cork, Republic of Ireland')
  })

  it('formats NI Translink stations with province in the borough slot', () => {
    expect(
      formatStationLocationDisplay({
        province: 'Ulster',
        county: 'Antrim',
        country: 'Northern Ireland',
        sourceCollectionId: 'stations_nitranslink',
      })
    ).toBe('Ulster, Antrim, Northern Ireland')
  })

  it('infers province from county when province is missing on NI stations', () => {
    expect(
      formatStationLocationDisplay({
        county: 'Antrim',
        country: 'Northern Ireland',
        sourceCollectionId: 'stations_nitranslink',
      })
    ).toBe('Ulster, Antrim, Northern Ireland')
  })

  it('infers province from county when province is missing on Irish Rail stations', () => {
    expect(
      formatStationLocationDisplay({
        county: 'Cork',
        country: 'Ireland',
        stnarea: 'ROIIRERAIL',
      })
    ).toBe('Munster, Cork, Ireland')
  })
})

describe('formatStationLocaleDisplay', () => {
  it('formats GB stations as country, county (borough)', () => {
    expect(
      formatStationLocaleDisplay({
        country: 'England',
        county: 'South Yorkshire',
        borough: 'Park Hill',
      })
    ).toBe('England, South Yorkshire (Park Hill)')
  })

  it('formats Irish Rail stations as country, province (county)', () => {
    expect(
      formatStationLocaleDisplay({
        country: 'Republic of Ireland',
        province: 'Munster',
        county: 'Cork',
        sourceCollectionId: 'stations_roiirerail',
      })
    ).toBe('Republic of Ireland, Munster (Cork)')
  })

  it('omits empty locality segments', () => {
    expect(
      formatStationLocaleDisplay({
        country: 'England',
        county: 'South Yorkshire',
      })
    ).toBe('England, South Yorkshire')
  })
})
