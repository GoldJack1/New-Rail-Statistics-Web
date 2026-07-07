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
})
