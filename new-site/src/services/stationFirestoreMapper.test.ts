import { describe, expect, it } from 'vitest'
import { mapFirestoreDocToStation } from '@/services/stationFirestoreMapper'

describe('stationFirestoreMapper', () => {
  it('maps list detail without sandbox detail fields', () => {
    const station = mapFirestoreDocToStation(
      'st-1',
      {
        stationname: 'Test',
        CrsCode: 'TST',
        TOC: 'GWR',
        stnarea: 'GBNR',
        borough: 'Westminster',
        yearlyPassengers: { '2023': 1200 },
        platforms: '2',
        stepFree: { stepFreeCode: 'A' },
        location: [51.5, -0.1],
      },
      'stations_gbnr',
      'list'
    )

    expect(station.stationName).toBe('Test')
    expect(station.yearlyPassengers).toEqual({ '2023': 1200 })
    expect(station.platforms).toBeUndefined()
    expect(station.stepFreeCode).toBeUndefined()
  })

  it('maps full detail with sandbox fields', () => {
    const station = mapFirestoreDocToStation(
      'st-1',
      {
        stationname: 'Test',
        CrsCode: 'TST',
        Platforms: '2',
        location: [51.5, -0.1],
      },
      'lightrail_GBSHEFFSUPERTRAM',
      'full'
    )

    expect(station.platforms).toBe('2')
  })

  it('maps province on list detail for NI Translink stations', () => {
    const station = mapFirestoreDocToStation(
      'ni-1',
      {
        stationname: 'Belfast Grand Central',
        CrsCode: 'BFG',
        stnarea: 'NITRANSLINK',
        country: 'Northern Ireland',
        county: 'Antrim',
        province: 'Ulster',
        location: [54.5952, -5.9407],
      },
      'stations_nitranslink',
      'list'
    )

    expect(station.province).toBe('Ulster')
  })

  it('reads Province with capital P on list detail', () => {
    const station = mapFirestoreDocToStation(
      'ie-1',
      {
        stationname: 'Cork Kent',
        CrsCode: 'CKC',
        stnarea: 'ROIIRERAIL',
        country: 'Ireland',
        county: 'Cork',
        Province: 'Munster',
        location: [51.9034, -8.4599],
      },
      'stations_roiirerail',
      'list'
    )

    expect(station.province).toBe('Munster')
  })
})
