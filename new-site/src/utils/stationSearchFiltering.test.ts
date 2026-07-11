import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import {
  filterStations,
  getAvailableStationSearchModes,
  getDefaultStationFilterSelections,
  getStationFilterOptions,
  sortStations,
} from './stationSearchFiltering'

const makeStation = (overrides: Partial<Station>): Station => ({
  id: overrides.id || '1',
  stationName: overrides.stationName || 'Alpha',
  crsCode: overrides.crsCode || 'ALP',
  tiploc: overrides.tiploc ?? null,
  latitude: overrides.latitude ?? 0,
  longitude: overrides.longitude ?? 0,
  country: overrides.country ?? null,
  county: overrides.county ?? null,
  toc: overrides.toc ?? null,
  stnarea: overrides.stnarea ?? null,
  borough: overrides.borough ?? null,
  fareZone: overrides.fareZone ?? null,
  yearlyPassengers: overrides.yearlyPassengers ?? null,
})

describe('stationSearchFiltering', () => {
  const stations: Station[] = [
    makeStation({
      id: '1',
      stationName: 'Baker Street',
      crsCode: 'BKS',
      country: 'England',
      county: 'Greater London',
      toc: 'TfL Rail',
      borough: 'Westminster',
      fareZone: '1',
      yearlyPassengers: { '2023': 200 },
    }),
    makeStation({
      id: '2',
      stationName: 'York',
      crsCode: 'YRK',
      country: 'England',
      county: 'North Yorkshire',
      toc: 'LNER',
      borough: 'York',
      fareZone: 'Outside',
      yearlyPassengers: { '2023': 500 },
    }),
    makeStation({
      id: '3',
      stationName: 'Cardiff',
      crsCode: 'CDF',
      country: 'Wales',
      county: 'South Glamorgan',
      toc: 'Transport for Wales',
      borough: 'Cardiff',
      fareZone: 'Outside',
      yearlyPassengers: { '2023': 300 },
    }),
  ]

  it('splits borough options into london and non-london lists', () => {
    const options = getStationFilterOptions(stations)
    expect(options.boroughs).toEqual(['Westminster'])
    expect(options.otherBoroughs).toEqual(['Cardiff', 'York'])
  })

  it('returns all stations with default all-selected filters', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const results = filterStations(stations, '', defaults, options)
    expect(results).toHaveLength(3)
  })

  it('filters by subset selections only', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const selections = { ...defaults, countries: ['Wales'] }
    const results = filterStations(stations, '', selections, options)
    expect(results.map((station) => station.id)).toEqual(['3'])
  })

  it('returns no stations when a category is explicitly cleared', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const selections = { ...defaults, countries: [] }
    const results = filterStations(stations, '', selections, options)
    expect(results).toHaveLength(0)
  })

  it('applies london borough only when greater london is the only county selected', () => {
    const options = getStationFilterOptions(stations)
    const selections = {
      tocs: options.tocs,
      countries: options.countries,
      counties: ['Greater London'],
      boroughs: ['Westminster'],
      allBoroughs: options.otherBoroughs,
      fareZones: options.fareZones,
    }
    const londonOnlyResults = filterStations(stations, '', selections, options)
    expect(londonOnlyResults.map((station) => station.id)).toEqual(['1'])

    const multiCountySelections = {
      ...selections,
      counties: ['Greater London', 'North Yorkshire'],
    }
    const multiCountyResults = filterStations(stations, '', multiCountySelections, options)
    expect(multiCountyResults.map((station) => station.id)).toEqual(['1', '2'])
  })

  it('filters by borough across all networks with the general borough filter', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const selections = {
      ...defaults,
      allBoroughs: ['York'],
    }
    const results = filterStations(stations, '', selections, options)
    expect(results.map((station) => station.id)).toEqual(['2'])
  })

  it('sorts stations by passenger count descending', () => {
    const sorted = sortStations(stations, 'passengers-desc')
    expect(sorted.map((station) => station.id)).toEqual(['2', '3', '1'])
  })

  it('filters by station name only in name search mode', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const byName = filterStations(stations, 'york', defaults, options, 'name')
    expect(byName.map((station) => station.id)).toEqual(['2'])

    const byCrsAsName = filterStations(stations, 'yrk', defaults, options, 'name')
    expect(byCrsAsName).toHaveLength(0)
  })

  it('filters by CRS code in crs search mode', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const results = filterStations(stations, 'bks', defaults, options, 'crs')
    expect(results.map((station) => station.id)).toEqual(['1'])
  })

  it('exposes CRS and TIPLOC tabs only for supported network views', () => {
    expect(getAvailableStationSearchModes('all')).toEqual(['name', 'crs', 'tiploc'])
    expect(getAvailableStationSearchModes('stations_gbnr')).toEqual(['name', 'crs', 'tiploc'])
    expect(getAvailableStationSearchModes('stations_nitranslink')).toEqual(['name', 'crs'])
    expect(getAvailableStationSearchModes('stations_roiirerail')).toEqual(['name', 'crs'])
    expect(getAvailableStationSearchModes('stations_gbheritage')).toEqual(['name'])
    expect(getAvailableStationSearchModes('lightrail_GBSHEFFSUPERTRAM')).toEqual(['name'])
  })
})
