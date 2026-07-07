import { describe, expect, it } from 'vitest'
import {
  buildFullStationIndex,
  mergeNetworkCollections,
  resolveFullStationFromCache,
  toMapLeanStation,
} from '@/utils/mapLeanStation'
import type { Station } from '@/types'

const sampleStation: Station = {
  id: 'st-1',
  stationName: 'Test Station',
  crsCode: 'TST',
  tiploc: 'TSTON',
  latitude: 51.5,
  longitude: -0.1,
  country: 'England',
  county: 'Greater London',
  toc: 'GWR',
  stnarea: 'GBNR',
  borough: 'Westminster',
  fareZone: '1',
  yearlyPassengers: { '2023': 1000 },
  sourceCollectionId: 'stations_gbnr',
}

describe('mapLeanStation', () => {
  it('strips detail fields for lean map markers', () => {
    const lean = toMapLeanStation(sampleStation)
    expect(lean.stationName).toBe('Test Station')
    expect(lean.yearlyPassengers).toBeNull()
    expect(lean.borough).toBeNull()
    expect(lean.sourceCollectionId).toBe('stations_gbnr')
  })

  it('resolves full station details from cache by id', () => {
    const lean = toMapLeanStation(sampleStation)
    const fullById = buildFullStationIndex([sampleStation])
    const resolved = resolveFullStationFromCache(lean, fullById)
    expect(resolved.yearlyPassengers).toEqual({ '2023': 1000 })
    expect(resolved.borough).toBe('Westminster')
  })

  it('merges network batches in name order', () => {
    const merged = mergeNetworkCollections([
      {
        collectionId: 'stations_gbnr',
        stations: [{ ...sampleStation, stationName: 'Zulu' }],
      },
      {
        collectionId: 'stations_nitranslink',
        stations: [{ ...sampleStation, id: 'st-2', stationName: 'Alpha' }],
      },
    ])
    expect(merged.map((station) => station.stationName)).toEqual(['Alpha', 'Zulu'])
  })
})
