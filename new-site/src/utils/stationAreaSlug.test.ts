import { describe, expect, it } from 'vitest'

import type { Station } from '../types'
import {
  findStationByShortNetworkPath,
  parseShortNetworkStationPath,
  stationIdsMatch,
} from './stationAreaSlug'

function stubStation(
  partial: Pick<Station, 'id' | 'stationName'> & Partial<Station>
): Station {
  return {
    crsCode: '',
    tiploc: '',
    latitude: 0,
    longitude: 0,
    country: '',
    county: '',
    toc: '',
    stnarea: '',
    yearlyPassengers: null,
    ...partial,
  }
}

describe('parseShortNetworkStationPath', () => {
  it('parses gbnr-1566 as GB National Rail', () => {
    expect(parseShortNetworkStationPath('gbnr-1566')).toEqual({
      collectionId: 'stations_gbnr',
      stationId: '1566',
    })
  })

  it('parses heritage and light-rail short codes', () => {
    expect(parseShortNetworkStationPath('gbheritage-12')).toEqual({
      collectionId: 'stations_gbheritage',
      stationId: '12',
    })
    expect(parseShortNetworkStationPath('supertram-3')).toEqual({
      collectionId: 'lightrail_GBSHEFFSUPERTRAM',
      stationId: '3',
    })
  })

  it('rejects id-only and long-category legacy formats', () => {
    expect(parseShortNetworkStationPath('0002')).toBeNull()
    expect(parseShortNetworkStationPath('rail-greatbritainnationalrail-0002')).toBeNull()
  })

  it('rejects full network URL slugs', () => {
    expect(parseShortNetworkStationPath('gb-national-rail')).toBeNull()
    expect(parseShortNetworkStationPath('gb-heritage')).toBeNull()
  })
})

describe('stationIdsMatch', () => {
  it('matches equal and zero-padded ids', () => {
    expect(stationIdsMatch('1566', '1566')).toBe(true)
    expect(stationIdsMatch('1566', '01566')).toBe(true)
    expect(stationIdsMatch('0002', '2')).toBe(true)
    expect(stationIdsMatch('1', '2')).toBe(false)
  })
})

describe('findStationByShortNetworkPath', () => {
  const stations: Station[] = [
    stubStation({
      id: '1566',
      stationName: 'Paddington',
      sourceCollectionId: 'stations_gbnr',
      urlSlug: 'london-paddington',
    }),
    stubStation({
      id: '1566',
      stationName: 'Heritage Twin',
      sourceCollectionId: 'stations_gbheritage',
    }),
  ]

  it('finds the station in the matching network only', () => {
    const found = findStationByShortNetworkPath(stations, 'gbnr-1566')
    expect(found?.stationName).toBe('Paddington')
    expect(found?.sourceCollectionId).toBe('stations_gbnr')
  })

  it('does not return a colliding id from another network', () => {
    const found = findStationByShortNetworkPath(stations, 'gbheritage-1566')
    expect(found?.stationName).toBe('Heritage Twin')
  })

  it('returns null for removed legacy formats', () => {
    expect(findStationByShortNetworkPath(stations, '1566')).toBeNull()
    expect(
      findStationByShortNetworkPath(stations, 'rail-greatbritainnationalrail-1566')
    ).toBeNull()
  })
})
