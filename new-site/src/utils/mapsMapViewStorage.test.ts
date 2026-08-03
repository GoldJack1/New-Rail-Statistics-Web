import { afterEach, describe, expect, it } from 'vitest'
import {
  clearMapsMapViewSessionState,
  readMapsMapViewSessionState,
  writeMapsMapViewSessionState,
} from './mapsMapViewStorage'
import { STATIONS_MAP_EMPTY_CENTER, STATIONS_MAP_EMPTY_ZOOM } from './mapsMapEmptyView'
import { LIGHTRAIL_COLLECTION_ID } from './lightRailStationFields'

afterEach(() => {
  clearMapsMapViewSessionState('all')
  clearMapsMapViewSessionState(LIGHTRAIL_COLLECTION_ID)
  clearMapsMapViewSessionState('stations_gbnr')
})

describe('mapsMapViewStorage', () => {
  it('does not persist the empty UK default camera', () => {
    writeMapsMapViewSessionState('all', {
      lat: STATIONS_MAP_EMPTY_CENTER[0],
      lng: STATIONS_MAP_EMPTY_CENTER[1],
      zoom: STATIONS_MAP_EMPTY_ZOOM,
    })
    expect(readMapsMapViewSessionState('all')).toBeNull()
  })

  it('rejects UK-overview zoom for compact networks when minZoom is provided', () => {
    writeMapsMapViewSessionState(
      LIGHTRAIL_COLLECTION_ID,
      {
        lat: 53.4,
        lng: -1.45,
        zoom: 6,
      },
      { minZoom: 10 }
    )
    expect(readMapsMapViewSessionState(LIGHTRAIL_COLLECTION_ID)).toBeNull()
  })

  it('persists country-scale zoom for national networks', () => {
    writeMapsMapViewSessionState(
      'stations_gbnr',
      {
        lat: 54.2,
        lng: -2.8,
        zoom: 6,
      },
      { minZoom: 4 }
    )
    expect(readMapsMapViewSessionState('stations_gbnr')).toEqual({
      lat: 54.2,
      lng: -2.8,
      zoom: 6,
    })
  })

  it('persists a usable single-network camera', () => {
    writeMapsMapViewSessionState(
      LIGHTRAIL_COLLECTION_ID,
      {
        lat: 53.4,
        lng: -1.45,
        zoom: 12,
      },
      { minZoom: 10 }
    )
    expect(readMapsMapViewSessionState(LIGHTRAIL_COLLECTION_ID)).toEqual({
      lat: 53.4,
      lng: -1.45,
      zoom: 12,
    })
  })

  it('persists a pinned user-owned camera for remount restore', () => {
    writeMapsMapViewSessionState(
      'stations_gbnr',
      {
        lat: 53.5,
        lng: -2.2,
        zoom: 9,
      },
      { pinned: true }
    )
    expect(readMapsMapViewSessionState('stations_gbnr')).toEqual({
      lat: 53.5,
      lng: -2.2,
      zoom: 9,
      pinned: true,
    })
  })
})
