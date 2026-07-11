import type { Station } from '@/types'
import type { NetworkViewFilter } from '@/constants/stationCollections'

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'passengers-asc'
  | 'passengers-desc'
  | 'toc-asc'
  | 'toc-desc'

export interface StationFilterOptions {
  tocs: string[]
  countries: string[]
  counties: string[]
  /** Boroughs of Greater London stations (used by the London Borough filter). */
  boroughs: string[]
  /** Boroughs of stations outside Greater London (used by the general Borough filter). */
  otherBoroughs: string[]
  fareZones: string[]
}

export interface StationFilterSelections {
  tocs: string[]
  countries: string[]
  counties: string[]
  /** London-only borough subset when Greater London is the sole county selection. */
  boroughs: string[]
  /** Borough filter across all networks in the current station set. */
  allBoroughs: string[]
  fareZones: string[]
}

export type StationSearchMode = 'name' | 'crs' | 'tiploc'

/** Which search-by tabs to show for the current network view. */
export function getAvailableStationSearchModes(networkView: NetworkViewFilter): StationSearchMode[] {
  const modes: StationSearchMode[] = ['name']

  const showCrs =
    networkView === 'all' ||
    networkView === 'stations_gbnr' ||
    networkView === 'stations_nitranslink' ||
    networkView === 'stations_roiirerail'

  const showTiploc = networkView === 'all' || networkView === 'stations_gbnr'

  if (showCrs) modes.push('crs')
  if (showTiploc) modes.push('tiploc')

  return modes
}

export function normalizeStationSearchInput(raw: string, mode: StationSearchMode): string {
  if (mode === 'name') return raw
  if (mode === 'crs') return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
}

export function getStationSearchPlaceholder(mode: StationSearchMode): string {
  switch (mode) {
    case 'crs':
      return 'CRS code e.g. PAD'
    case 'tiploc':
      return 'TIPLOC e.g. PADTON'
    default:
      return 'Search stations...'
  }
}

const stationMatchesSearchTerm = (
  station: Station,
  normalizedSearchTerm: string,
  searchMode: StationSearchMode
): boolean => {
  if (normalizedSearchTerm.length === 0) return true

  switch (searchMode) {
    case 'crs':
      return station.crsCode?.toLowerCase().includes(normalizedSearchTerm) ?? false
    case 'tiploc':
      return station.tiploc?.toLowerCase().includes(normalizedSearchTerm) ?? false
    default:
      return station.stationName?.toLowerCase().includes(normalizedSearchTerm) ?? false
  }
}

export const isOnlyGreaterLondonSelected = (counties: string[]) =>
  counties.length === 1 && counties[0] === 'Greater London'

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0

const sortAlphabetically = (values: string[]) =>
  [...values].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

const shouldApplyCategoryFilter = (selected: string[], allOptions: string[]) =>
  selected.length !== allOptions.length

const getLatestPassengers = (station: Station): number => {
  if (station.yearlyPassengers && typeof station.yearlyPassengers === 'object') {
    const years = Object.keys(station.yearlyPassengers)
      .filter((year) => /^\d{4}$/.test(year))
      .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))

    if (years.length > 0) {
      const latestValue = station.yearlyPassengers[years[0]]
      return typeof latestValue === 'number' ? latestValue : 0
    }
  }
  return 0
}

export const getStationFilterOptions = (stations: Station[]): StationFilterOptions => ({
  tocs: sortAlphabetically([...new Set(stations.map((station) => station.toc).filter(isNonEmptyString))]),
  countries: sortAlphabetically([...new Set(stations.map((station) => station.country).filter(isNonEmptyString))]),
  counties: sortAlphabetically([...new Set(stations.map((station) => station.county).filter(isNonEmptyString))]),
  boroughs: sortAlphabetically([
    ...new Set(
      stations
        .filter((station) => station.county === 'Greater London')
        .map((station) => station.borough)
        .filter(isNonEmptyString)
    ),
  ]),
  otherBoroughs: sortAlphabetically([
    ...new Set(
      stations
        .filter((station) => station.county !== 'Greater London')
        .map((station) => station.borough)
        .filter(isNonEmptyString)
    ),
  ]),
  fareZones: sortAlphabetically([...new Set(stations.map((station) => station.fareZone).filter(isNonEmptyString))]),
})

export const getDefaultStationFilterSelections = (
  options: StationFilterOptions
): StationFilterSelections => ({
  tocs: options.tocs,
  countries: options.countries,
  counties: options.counties,
  boroughs: options.boroughs,
  allBoroughs: options.otherBoroughs,
  fareZones: options.fareZones,
})

export const filterStations = (
  stations: Station[],
  searchTerm: string,
  selections: StationFilterSelections,
  options: StationFilterOptions,
  searchMode: StationSearchMode = 'name'
): Station[] => {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  return stations.filter((station) => {
    const searchTermMatch = stationMatchesSearchTerm(station, normalizedSearchTerm, searchMode)

    const tocMatch =
      !shouldApplyCategoryFilter(selections.tocs, options.tocs) ||
      selections.tocs.includes(station.toc || '')
    const countryMatch =
      !shouldApplyCategoryFilter(selections.countries, options.countries) ||
      selections.countries.includes(station.country || '')
    const countyMatch =
      !shouldApplyCategoryFilter(selections.counties, options.counties) ||
      selections.counties.includes(station.county || '')

    const londonBoroughFilterEnabled = isOnlyGreaterLondonSelected(selections.counties)
    const londonBoroughSubsetSelected = shouldApplyCategoryFilter(
      selections.boroughs,
      options.boroughs
    )
    const londonBoroughMatch =
      !londonBoroughFilterEnabled ||
      station.county !== 'Greater London' ||
      !londonBoroughSubsetSelected ||
      selections.boroughs.includes(station.borough || '')

    const allBoroughSubsetSelected = shouldApplyCategoryFilter(
      selections.allBoroughs,
      options.otherBoroughs
    )
    const allBoroughMatch =
      !allBoroughSubsetSelected ||
      (isNonEmptyString(station.borough) && selections.allBoroughs.includes(station.borough))

    const fareZoneMatch =
      !shouldApplyCategoryFilter(selections.fareZones, options.fareZones) ||
      selections.fareZones.includes(station.fareZone || '')

    return (
      searchTermMatch &&
      tocMatch &&
      countryMatch &&
      countyMatch &&
      londonBoroughMatch &&
      allBoroughMatch &&
      fareZoneMatch
    )
  })
}

export const sortStations = (stations: Station[], sortOption: SortOption): Station[] =>
  [...stations].sort((a, b) => {
    switch (sortOption) {
      case 'name-asc':
        return (a.stationName || '').localeCompare(b.stationName || '')
      case 'name-desc':
        return (b.stationName || '').localeCompare(a.stationName || '')
      case 'toc-asc':
        return (a.toc || '').localeCompare(b.toc || '')
      case 'toc-desc':
        return (b.toc || '').localeCompare(a.toc || '')
      case 'passengers-asc':
        return getLatestPassengers(a) - getLatestPassengers(b)
      case 'passengers-desc':
        return getLatestPassengers(b) - getLatestPassengers(a)
      default:
        return 0
    }
  })
