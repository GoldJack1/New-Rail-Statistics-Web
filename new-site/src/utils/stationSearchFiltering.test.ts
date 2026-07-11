import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import {
  filterStations,
  getAvailableStationSearchModes,
  getBoroughOptionsForCountySelection,
  getBoroughSelectionsForCountyChange,
  getBoroughsForCounties,
  getDefaultStationFilterSelections,
  getDisabledBoroughPositions,
  getStationFilterOptions,
  sortOptionToTableSort,
  sortStations,
  tableSortToSortOption,
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

  it('exposes all boroughs in the DDM', () => {
    const options = getStationFilterOptions(stations)
    expect(options.allBoroughs).toEqual(['Cardiff', 'Westminster', 'York'])
  })

  it('scopes borough options to the selected county', () => {
    const options = getStationFilterOptions(stations)

    expect(
      getBoroughOptionsForCountySelection(stations, ['Greater London'], options.counties)
    ).toEqual(['Westminster'])

    expect(
      getBoroughOptionsForCountySelection(stations, ['North Yorkshire'], options.counties)
    ).toEqual(['York'])
  })

  it('returns all boroughs when every county is selected', () => {
    const options = getStationFilterOptions(stations)
    expect(
      getBoroughOptionsForCountySelection(stations, options.counties, options.counties)
    ).toEqual(['Cardiff', 'Westminster', 'York'])
    expect(
      getDisabledBoroughPositions(options.allBoroughs, options.allBoroughs)
    ).toEqual([])
  })

  it('disables boroughs outside the selected county', () => {
    const options = getStationFilterOptions(stations)
    const enabledBoroughs = getBoroughOptionsForCountySelection(
      stations,
      ['Greater London'],
      options.counties
    )

    expect(getDisabledBoroughPositions(options.allBoroughs, enabledBoroughs)).toEqual([0, 2])
  })

  it('includes combined borough labels from Greater London stations', () => {
    const londonStations: Station[] = [
      makeStation({
        id: '1',
        county: 'Greater London',
        borough: 'Greenwich & Bexley',
      }),
      makeStation({
        id: '2',
        county: 'Greater London',
        borough: 'Hackney',
      }),
      makeStation({
        id: '3',
        county: 'North Yorkshire',
        borough: 'York',
      }),
    ]

    expect(getBoroughsForCounties(londonStations, ['Greater London'])).toEqual([
      'Greenwich & Bexley',
      'Hackney',
    ])

    const options = getStationFilterOptions(londonStations)
    const londonSelections = {
      ...getDefaultStationFilterSelections(options),
      counties: ['Greater London'],
      boroughs: getBoroughSelectionsForCountyChange(
        londonStations,
        ['Greater London'],
        options.counties,
        options.allBoroughs
      ),
    }
    const results = filterStations(londonStations, '', londonSelections, options)
    expect(results.map((station) => station.id)).toEqual(['1', '2'])
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

  it('filters to Greater London when only that county is selected', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const londonSelections = {
      ...defaults,
      counties: ['Greater London'],
      boroughs: getBoroughSelectionsForCountyChange(
        stations,
        ['Greater London'],
        options.counties,
        options.allBoroughs
      ),
    }
    const results = filterStations(stations, '', londonSelections, options)
    expect(results.map((station) => station.id)).toEqual(['1'])
  })

  it('filters by borough within the selected county', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const selections = {
      ...defaults,
      counties: ['North Yorkshire'],
      boroughs: ['York'],
    }
    const results = filterStations(stations, '', selections, options)
    expect(results.map((station) => station.id)).toEqual(['2'])
  })

  it('sorts stations by passenger count descending', () => {
    const sorted = sortStations(stations, 'passengers-desc')
    expect(sorted.map((station) => station.id)).toEqual(['2', '3', '1'])
  })

  it('ignores null values for the latest passenger year when sorting', () => {
    const passengerStations: Station[] = [
      makeStation({
        id: 'low',
        stationName: 'Abbey Wood',
        yearlyPassengers: { '2025': 100, '2026': null },
      }),
      makeStation({
        id: 'high',
        stationName: 'London Waterloo',
        yearlyPassengers: { '2025': 500, '2026': null },
      }),
    ]

    const sorted = sortStations(passengerStations, 'passengers-desc')
    expect(sorted.map((station) => station.id)).toEqual(['high', 'low'])
  })

  it('maps sidebar sort options to table sort state', () => {
    expect(sortOptionToTableSort('passengers-desc')).toEqual({
      column: 'latestPassengers',
      direction: 'desc',
    })
    expect(tableSortToSortOption({ column: 'toc', direction: 'asc' })).toBe('toc-asc')
    expect(tableSortToSortOption({ column: 'county', direction: 'asc' })).toBeNull()
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
