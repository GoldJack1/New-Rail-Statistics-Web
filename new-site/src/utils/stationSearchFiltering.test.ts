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
  dateOpened: overrides.dateOpened ?? null,
  orderOfOpening: overrides.orderOfOpening ?? null,
  province: overrides.province ?? null,
  sourceCollectionId: overrides.sourceCollectionId,
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

  it('includes SYSupertram in TOC options and filters SuperTram stops by it', () => {
    const mixed: Station[] = [
      makeStation({ id: 'rail', stationName: 'York', toc: 'LNER' }),
      makeStation({
        id: 'tram',
        stationName: 'Cathedral',
        toc: null,
        sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
        stnarea: 'GBSHEFFSUPERTRAM',
      }),
    ]

    const options = getStationFilterOptions(mixed)
    expect(options.tocs).toEqual(['LNER', 'SYSupertram'])

    const filtered = filterStations(
      mixed,
      '',
      { ...getDefaultStationFilterSelections(options), tocs: ['SYSupertram'] },
      options
    )
    expect(filtered.map((station) => station.id)).toEqual(['tram'])
  })

  it('exposes provinces from Irish / NI stations and filters by them', () => {
    const irishStations: Station[] = [
      makeStation({
        id: 'cork',
        stationName: 'Cork',
        county: 'Cork',
        country: 'Ireland',
        province: 'Munster',
        sourceCollectionId: 'stations_roiirerail',
      }),
      makeStation({
        id: 'belfast',
        stationName: 'Belfast Central',
        county: 'Antrim',
        country: 'Northern Ireland',
        province: 'Ulster',
        sourceCollectionId: 'stations_nitranslink',
      }),
      makeStation({
        id: 'york',
        stationName: 'York',
        county: 'North Yorkshire',
        country: 'England',
        sourceCollectionId: 'stations_gbnr',
      }),
    ]

    const options = getStationFilterOptions(irishStations)
    expect(options.provinces).toEqual(['Munster', 'Ulster'])

    const defaults = getDefaultStationFilterSelections(options)
    const filtered = filterStations(
      irishStations,
      '',
      { ...defaults, provinces: ['Ulster'] },
      options
    )
    expect(filtered.map((station) => station.id)).toEqual(['belfast'])
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

  it('exposes date opened values in chronological order', () => {
    const withDates: Station[] = [
      makeStation({ id: '1', dateOpened: '22/08/1994' }),
      makeStation({ id: '2', dateOpened: '21/03/1994' }),
      makeStation({ id: '3', dateOpened: '18/02/1995' }),
      makeStation({ id: '4', dateOpened: '21/03/1994' }),
    ]
    const options = getStationFilterOptions(withDates)
    expect(options.dateOpened).toEqual(['21/03/1994', '22/08/1994', '18/02/1995'])
  })

  it('filters by date opened selections', () => {
    const withDates: Station[] = [
      makeStation({ id: '1', dateOpened: '21/03/1994' }),
      makeStation({ id: '2', dateOpened: '22/08/1994' }),
      makeStation({ id: '3', dateOpened: '18/02/1995' }),
    ]
    const options = getStationFilterOptions(withDates)
    const defaults = getDefaultStationFilterSelections(options)
    const results = filterStations(
      withDates,
      '',
      { ...defaults, dateOpened: ['21/03/1994', '18/02/1995'] },
      options
    )
    expect(results.map((station) => station.id)).toEqual(['1', '3'])
  })

  it('returns all stations with default all-selected filters', () => {
    const options = getStationFilterOptions(stations)
    const defaults = getDefaultStationFilterSelections(options)
    const results = filterStations(stations, '', defaults, options)
    expect(results).toBe(stations)
  })

  it('skips copy+sort when stations are already name-asc', () => {
    const nameAsc = [stations[0], stations[2], stations[1]] as Station[]
    const sorted = sortStations(nameAsc, 'name-asc')
    expect(sorted).toBe(nameAsc)
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

  it('sorts by a chosen passenger year and drops stations without that year', () => {
    const passengerStations: Station[] = [
      makeStation({
        id: 'a',
        stationName: 'Alpha',
        yearlyPassengers: { '2023': 100, '2024': 900 },
      }),
      makeStation({
        id: 'b',
        stationName: 'Bravo',
        yearlyPassengers: { '2023': 500, '2024': 50 },
      }),
      makeStation({
        id: 'c',
        stationName: 'Charlie',
        yearlyPassengers: { '2024': 200 },
      }),
    ]

    expect(
      sortStations(passengerStations, 'passengers-desc', { passengerYear: '2023' }).map(
        (station) => station.id
      )
    ).toEqual(['b', 'a'])

    expect(
      sortStations(passengerStations, 'passengers-asc', { passengerYear: '2024' }).map(
        (station) => station.id
      )
    ).toEqual(['b', 'c', 'a'])
  })

  it('sorts by date opened then order of opening within that date', () => {
    // SuperTram assigns order per opening date (orders can repeat across dates).
    const withDates: Station[] = [
      makeStation({ id: 'carbrook', stationName: 'Carbrook', dateOpened: '21/03/1994', orderOfOpening: 3 }),
      makeStation({
        id: 'meadowhall',
        stationName: 'Meadowhall Interchange',
        dateOpened: '21/03/1994',
        orderOfOpening: 1,
      }),
      makeStation({
        id: 'meadowhall-south',
        stationName: 'Meadowhall South/Tinsley',
        dateOpened: '21/03/1994',
        orderOfOpening: 2,
      }),
      makeStation({
        id: 'arbourthorne',
        stationName: 'Arbourthorne Road',
        dateOpened: '22/08/1994',
        orderOfOpening: 4,
      }),
      makeStation({
        id: 'arena',
        stationName: 'Arena/Olympic Legacy Park',
        dateOpened: '22/08/1994',
        orderOfOpening: 7,
      }),
      makeStation({ id: 'none', stationName: 'Z', dateOpened: null }),
    ]

    expect(sortStations(withDates, 'date-opened-asc').map((station) => station.id)).toEqual([
      'meadowhall',
      'meadowhall-south',
      'carbrook',
      'arbourthorne',
      'arena',
      'none',
    ])
    expect(sortStations(withDates, 'date-opened-desc').map((station) => station.id)).toEqual([
      'arena',
      'arbourthorne',
      'carbrook',
      'meadowhall-south',
      'meadowhall',
      'none',
    ])
  })

  it('maps sidebar sort options to table sort state', () => {
    expect(sortOptionToTableSort('passengers-desc')).toEqual({
      column: 'latestPassengers',
      direction: 'desc',
    })
    expect(sortOptionToTableSort('date-opened-asc')).toEqual({
      column: 'dateOpened',
      direction: 'asc',
    })
    expect(tableSortToSortOption({ column: 'toc', direction: 'asc' })).toBe('toc-asc')
    expect(tableSortToSortOption({ column: 'dateOpened', direction: 'desc' })).toBe(
      'date-opened-desc'
    )
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
