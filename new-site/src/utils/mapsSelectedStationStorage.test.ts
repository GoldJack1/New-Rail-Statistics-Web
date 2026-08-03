import { afterEach, describe, expect, it } from 'vitest'
import {
  readMapsSelectedStationKey,
  writeMapsSelectedStationKey,
} from './mapsSelectedStationStorage'

describe('mapsSelectedStationStorage', () => {
  afterEach(() => {
    writeMapsSelectedStationKey(null)
  })

  it('reads null when nothing is stored', () => {
    expect(readMapsSelectedStationKey()).toBeNull()
  })

  it('persists and clears a station key', () => {
    writeMapsSelectedStationKey('national-rail:abc')
    expect(readMapsSelectedStationKey()).toBe('national-rail:abc')
    writeMapsSelectedStationKey(null)
    expect(readMapsSelectedStationKey()).toBeNull()
  })
})
