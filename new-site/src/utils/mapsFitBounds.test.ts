import { describe, expect, it } from 'vitest'
import L from 'leaflet'
import {
  getStationsMapFitPadding,
  getStationsBoundsSignature,
  planStationsMapFit,
  viewCoversStationBounds,
  viewCoversStations,
  viewIntersectsStations,
  shouldRestoreSavedMapView,
  fitPaddingToLeafletOptions,
  minUsableZoomForStationSpan,
  minUsableZoomForStations,
  estimateZoomToBounds,
  STATIONS_MAP_DEFAULT_CHROME,
  STATIONS_MAP_TIMELINE_BOTTOM_CHROME,
  STATIONS_MAP_SINGLE_STATION_ZOOM,
} from './mapsFitBounds'
import { getSuperTramIconOuterDiameter } from './mapMarkerSizing'

describe('getStationsMapFitPadding', () => {
  it('uses compact base padding that still clears Supertram pin size', () => {
    const bounds = L.latLngBounds([53.35, -1.55], [53.48, -1.3])
    const padding = getStationsMapFitPadding(bounds, { useSuperTramMarkers: true, mobile: false })
    const markerClearance = Math.ceil(getSuperTramIconOuterDiameter(false, false) / 2) + 4
    const edge = Math.max(32, markerClearance)

    expect(padding.top).toBe(edge + STATIONS_MAP_DEFAULT_CHROME.top)
    expect(padding.left).toBe(edge + STATIONS_MAP_DEFAULT_CHROME.left)
    expect(padding.right).toBe(edge + STATIONS_MAP_DEFAULT_CHROME.right)
    expect(padding.bottom).toBe(edge + STATIONS_MAP_DEFAULT_CHROME.bottom)
  })

  it('uses medium padding for regional networks', () => {
    const bounds = L.latLngBounds([51.2, -0.5], [51.8, 0.2])
    const padding = getStationsMapFitPadding(bounds)
    expect(padding.top).toBeGreaterThanOrEqual(36 + STATIONS_MAP_DEFAULT_CHROME.top)
  })

  it('uses tight padding for country-scale bounds so the fit is not over-zoomed-out', () => {
    const bounds = L.latLngBounds([50, -8], [59, 2])
    const padding = getStationsMapFitPadding(bounds)
    // Country-scale: small base + heavily reduced chrome.
    expect(padding.top).toBeLessThan(12 + Math.round(STATIONS_MAP_DEFAULT_CHROME.top * 0.35))
    expect(padding.top).toBeGreaterThan(10)
  })

  it('reduces padding on a short viewport', () => {
    const bounds = L.latLngBounds([53.35, -1.55], [53.48, -1.3])
    const desktop = getStationsMapFitPadding(bounds, { mapSize: { x: 1200, y: 800 } })
    const mobile = getStationsMapFitPadding(bounds, { mapSize: { x: 390, y: 280 } })
    expect(mobile.top).toBeLessThan(desktop.top)
    expect(mobile.left).toBeLessThan(desktop.left)
  })

  it('clamps padding so it cannot consume the map canvas', () => {
    const bounds = L.latLngBounds([50, -8], [59, 2])
    const padding = getStationsMapFitPadding(bounds, { mapSize: { x: 200, y: 160 } })
    expect(padding.top + padding.bottom).toBeLessThanOrEqual(160)
    expect(padding.left + padding.right).toBeLessThanOrEqual(200)
  })

  it('scales min usable zoom by network geographic span', () => {
    expect(minUsableZoomForStationSpan(0.2)).toBe(10)
    expect(minUsableZoomForStationSpan(1.2)).toBe(8)
    expect(minUsableZoomForStationSpan(4)).toBe(6)
    expect(minUsableZoomForStationSpan(12)).toBe(4)
  })

  it('lowers min usable zoom on a small viewport for country-scale networks', () => {
    const stations = [
      { latitude: 50.0, longitude: -8.0 },
      { latitude: 59.0, longitude: 2.0 },
    ]
    const desktopMin = minUsableZoomForStations(stations, { x: 1200, y: 800 })
    const mobileMin = minUsableZoomForStations(stations, { x: 390, y: 280 })
    expect(mobileMin).toBeLessThanOrEqual(desktopMin)
  })

  it('applies asymmetric chrome padding including timeline bottom', () => {
    const bounds = L.latLngBounds([53.35, -1.55], [53.48, -1.3])
    const withoutTimeline = getStationsMapFitPadding(bounds)
    const withTimeline = getStationsMapFitPadding(bounds, {
      chrome: {
        ...STATIONS_MAP_DEFAULT_CHROME,
        bottom: STATIONS_MAP_DEFAULT_CHROME.bottom + STATIONS_MAP_TIMELINE_BOTTOM_CHROME,
      },
    })
    expect(withTimeline.bottom - withoutTimeline.bottom).toBe(STATIONS_MAP_TIMELINE_BOTTOM_CHROME)
    expect(withTimeline.top).toBe(withoutTimeline.top)
  })

  it('maps padding to Leaflet top-left / bottom-right point pairs', () => {
    const padding = { top: 10, right: 20, bottom: 30, left: 40 }
    expect(fitPaddingToLeafletOptions(padding)).toEqual({
      paddingTopLeft: [40, 10],
      paddingBottomRight: [20, 30],
    })
  })
})

describe('estimateZoomToBounds', () => {
  it('estimates a higher zoom for a larger viewport', () => {
    const bounds = L.latLngBounds([53.35, -1.55], [53.48, -1.3])
    const padding = { top: 40, right: 40, bottom: 40, left: 40 }
    const large = estimateZoomToBounds(bounds, { x: 1200, y: 800 }, padding)
    const small = estimateZoomToBounds(bounds, { x: 360, y: 240 }, padding)
    expect(large).toBeGreaterThan(small)
  })
})

describe('getStationsBoundsSignature', () => {
  it('returns a stable signature for the same pin set', () => {
    const stations = [
      { latitude: 53.4, longitude: -1.5 },
      { latitude: 53.5, longitude: -1.4 },
    ]
    expect(getStationsBoundsSignature(stations)).toBe(getStationsBoundsSignature([...stations].reverse()))
  })

  it('changes when count or extent changes', () => {
    const a = getStationsBoundsSignature([{ latitude: 53.4, longitude: -1.5 }])
    const b = getStationsBoundsSignature([
      { latitude: 53.4, longitude: -1.5 },
      { latitude: 53.5, longitude: -1.4 },
    ])
    expect(a).not.toBe(b)
  })

  it('uses a shared empty signature for invalid / empty sets', () => {
    expect(getStationsBoundsSignature([])).toBe('0')
    expect(getStationsBoundsSignature([{ latitude: 0, longitude: 0 }])).toBe('0')
  })
})

describe('planStationsMapFit', () => {
  it('marks empty station lists as not persistable', () => {
    expect(planStationsMapFit([])).toEqual({ kind: 'empty', persistable: false })
    expect(planStationsMapFit([{ latitude: 0, longitude: 0 }])).toEqual({
      kind: 'empty',
      persistable: false,
    })
  })

  it('plans a single-station camera', () => {
    expect(planStationsMapFit([{ latitude: 53.4, longitude: -1.5 }])).toEqual({
      kind: 'single',
      persistable: true,
      lat: 53.4,
      lng: -1.5,
      zoom: STATIONS_MAP_SINGLE_STATION_ZOOM,
    })
  })

  it('plans bounds fit for multiple stations using viewport size', () => {
    const plan = planStationsMapFit(
      [
        { latitude: 53.35, longitude: -1.55 },
        { latitude: 53.48, longitude: -1.3 },
      ],
      { mapSize: { x: 800, y: 600 } }
    )
    expect(plan.kind).toBe('bounds')
    if (plan.kind === 'bounds') {
      expect(plan.persistable).toBe(true)
      expect(plan.padding.top).toBeGreaterThan(0)
      expect(plan.estimatedZoom).toBeGreaterThan(0)
      expect(plan.estimatedZoom).toBeLessThanOrEqual(14)
    }
  })
})

describe('viewCoversStationBounds', () => {
  const supertramBounds = L.latLngBounds([53.35, -1.55], [53.48, -1.3])
  const mapSize = { x: 800, y: 600 }
  const padding = getStationsMapFitPadding(supertramBounds, {
    useSuperTramMarkers: true,
    mapSize,
  })

  it('returns true for a camera that frames the network', () => {
    const camera = { lat: 53.415, lng: -1.425, zoom: 11 }
    expect(viewCoversStationBounds(camera, mapSize, supertramBounds, padding)).toBe(true)
  })

  it('returns false when zoom is too tight and misses an edge pin', () => {
    const camera = { lat: 53.415, lng: -1.425, zoom: 16 }
    expect(viewCoversStationBounds(camera, mapSize, supertramBounds, padding)).toBe(false)
  })

  it('returns false for empty station sets via viewCoversStations', () => {
    expect(viewCoversStations({ lat: 54.5, lng: -2.5, zoom: 6 }, mapSize, [])).toBe(false)
  })

  it('rejects zero-sized maps', () => {
    expect(
      viewCoversStationBounds(
        { lat: 53.415, lng: -1.425, zoom: 11 },
        { x: 0, y: 600 },
        supertramBounds,
        padding
      )
    ).toBe(false)
  })
})

describe('shouldRestoreSavedMapView', () => {
  const gbStations = [
    { latitude: 50.1, longitude: -5.5 },
    { latitude: 58.6, longitude: -3.5 },
    { latitude: 51.5, longitude: -0.1 },
    { latitude: 53.4, longitude: -2.9 },
  ]
  const mapSize = { x: 1000, y: 700 }

  it('rejects a Northern-England style partial view for GB National Rail', () => {
    const northernEngland = { lat: 54.5, lng: -2.0, zoom: 8 }
    expect(shouldRestoreSavedMapView(northernEngland, mapSize, gbStations)).toBe(false)
  })

  it('still rejects unpinned Northern-England partials', () => {
    const northernEngland = { lat: 54.5, lng: -2.0, zoom: 8 }
    expect(shouldRestoreSavedMapView(northernEngland, mapSize, gbStations)).toBe(false)
  })

  it('restores a pinned leave-map camera even when it is a regional view', () => {
    const northernEngland = { lat: 54.5, lng: -2.0, zoom: 8, pinned: true }
    expect(shouldRestoreSavedMapView(northernEngland, mapSize, gbStations)).toBe(true)
  })

  it('keeps a pinned station close-up when returning from details', () => {
    const londonCloseUp = { lat: 51.5, lng: -0.12, zoom: 12, pinned: true }
    expect(shouldRestoreSavedMapView(londonCloseUp, mapSize, gbStations)).toBe(true)
  })

  it('keeps a pinned close-up before pins have loaded', () => {
    const herdingsPark = { lat: 53.34251, lng: -1.43925, zoom: 15, pinned: true }
    expect(shouldRestoreSavedMapView(herdingsPark, mapSize, [])).toBe(true)
  })

  it('restores a pinned mid-zoom camera before pins load', () => {
    const regional = { lat: 54.5, lng: -2.0, zoom: 8, pinned: true }
    expect(shouldRestoreSavedMapView(regional, mapSize, [])).toBe(true)
  })

  it('never restores the empty UK default even if marked pinned', () => {
    const emptyDefault = { lat: 54.5, lng: -2.5, zoom: 3, pinned: true }
    expect(shouldRestoreSavedMapView(emptyDefault, mapSize, gbStations)).toBe(false)
    expect(shouldRestoreSavedMapView(emptyDefault, mapSize, [])).toBe(false)
  })

  it('keeps an intentional close-up that only covers part of the network', () => {
    const londonCloseUp = { lat: 51.5, lng: -0.12, zoom: 12 }
    expect(shouldRestoreSavedMapView(londonCloseUp, mapSize, gbStations)).toBe(true)
  })

  it('keeps a camera that already frames the full network', () => {
    const national = { lat: 54.5, lng: -2.5, zoom: 6 }
    expect(shouldRestoreSavedMapView(national, mapSize, gbStations)).toBe(true)
  })
})
