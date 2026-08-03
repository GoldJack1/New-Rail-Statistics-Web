import { describe, expect, it } from 'vitest'
import {
  getMapViewportMarkerLimit,
  getStationsForViewportMarkers,
  shouldCullStationsMapMarkers,
} from './mapsViewportMarkers'
import type { Station } from '@/types'

function stubStation(id: string, latitude: number, longitude: number): Station {
  return {
    id,
    name: id,
    latitude,
    longitude,
  } as unknown as Station
}

function stubBounds(west: number, south: number, east: number, north: number) {
  const contains = ([lat, lng]: [number, number]) =>
    lat >= south && lat <= north && lng >= west && lng <= east

  const bounds = {
    contains,
    pad(bufferRatio: number) {
      const latPad = (north - south) * bufferRatio
      const lngPad = (east - west) * bufferRatio
      return stubBounds(west - lngPad, south - latPad, east + lngPad, north + latPad)
    },
  }
  return bounds
}

describe('shouldCullStationsMapMarkers', () => {
  it('always culls in lite mode', () => {
    expect(shouldCullStationsMapMarkers(10, 'stations_gbnr', true)).toBe(true)
  })

  it('always culls the All network view', () => {
    expect(shouldCullStationsMapMarkers(10, 'all', false)).toBe(true)
  })

  it('culls large single-network sets', () => {
    expect(shouldCullStationsMapMarkers(400, 'stations_gbnr', false)).toBe(true)
    expect(shouldCullStationsMapMarkers(50, 'stations_gbnr', false)).toBe(false)
  })
})

describe('getMapViewportMarkerLimit', () => {
  it('uses a lower cap in lite mode', () => {
    expect(getMapViewportMarkerLimit(true)).toBeLessThan(getMapViewportMarkerLimit(false))
  })
})

describe('getStationsForViewportMarkers', () => {
  const stations = [
    stubStation('a', 53.4, -1.5),
    stubStation('b', 53.5, -1.4),
    stubStation('c', 51.5, -0.1),
  ]

  it('returns only stations inside the padded viewport', () => {
    const bounds = stubBounds(-1.55, 53.35, -1.35, 53.55)
    const result = getStationsForViewportMarkers(stations, bounds, {
      selectedStationId: null,
      maxMarkers: 100,
      pad: 0,
    })
    expect(result.map((station) => station.id)).toEqual(['a', 'b'])
  })

  it('always includes the selected station even when outside the viewport', () => {
    const bounds = stubBounds(-1.55, 53.35, -1.35, 53.55)
    const result = getStationsForViewportMarkers(stations, bounds, {
      selectedStationId: 'c',
      maxMarkers: 100,
      pad: 0,
    })
    expect(result.map((station) => station.id)).toEqual(['c', 'a', 'b'])
  })

  it('caps the number of markers', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      stubStation(`s${index}`, 53.4 + index * 0.001, -1.5)
    )
    const bounds = stubBounds(-2, 53, -1, 54)
    const result = getStationsForViewportMarkers(many, bounds, {
      selectedStationId: null,
      maxMarkers: 5,
      pad: 0,
    })
    expect(result).toHaveLength(5)
  })
})
