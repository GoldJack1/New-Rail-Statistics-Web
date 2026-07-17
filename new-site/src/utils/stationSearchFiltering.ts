import type { Station } from '@/types'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import { isGreaterLondonCounty } from '@/utils/formatStationLocation'
import { boroughLabelMatchesSelection } from '@/utils/londonBoroughs'
import { getLatestYearlyPassengerCount } from '@/utils/yearlyPassengers'
import type { StationsTableSort } from '@/utils/stationsTableColumns'

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
  /** All borough values shown in the Borough filter DDM. */
  allBoroughs: string[]
  fareZones: string[]
}

export interface StationFilterSelections {
  tocs: string[]
  countries: string[]
  counties: string[]
  /** Selected boroughs in the Borough filter DDM. */
  boroughs: string[]
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
  counties.length === 1 && isGreaterLondonCounty(counties[0])

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0

const sortAlphabetically = (values: string[]) =>
  [...values].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

const shouldApplyCategoryFilter = (selected: string[], allOptions: string[]) =>
  selected.length !== allOptions.length

const getLatestPassengers = (station: Station): number =>
  getLatestYearlyPassengerCount(station.yearlyPassengers) ?? 0

export const sortOptionToTableSort = (sortOption: SortOption): StationsTableSort => {
  switch (sortOption) {
    case 'name-desc':
      return { column: 'name', direction: 'desc' }
    case 'toc-asc':
      return { column: 'toc', direction: 'asc' }
    case 'toc-desc':
      return { column: 'toc', direction: 'desc' }
    case 'passengers-asc':
      return { column: 'latestPassengers', direction: 'asc' }
    case 'passengers-desc':
      return { column: 'latestPassengers', direction: 'desc' }
    case 'name-asc':
    default:
      return { column: 'name', direction: 'asc' }
  }
}

export const tableSortToSortOption = (sort: StationsTableSort): SortOption | null => {
  if (sort.column === 'name') {
    return sort.direction === 'desc' ? 'name-desc' : 'name-asc'
  }
  if (sort.column === 'toc') {
    return sort.direction === 'desc' ? 'toc-desc' : 'toc-asc'
  }
  if (sort.column === 'latestPassengers') {
    return sort.direction === 'desc' ? 'passengers-desc' : 'passengers-asc'
  }
  return null
}

export const getStationFilterOptions = (stations: Station[]): StationFilterOptions => {
  const tocs = new Set<string>()
  const countries = new Set<string>()
  const counties = new Set<string>()
  const allBoroughs = new Set<string>()
  const fareZones = new Set<string>()

  for (const station of stations) {
    if (isNonEmptyString(station.toc)) tocs.add(station.toc)
    if (isNonEmptyString(station.country)) countries.add(station.country)
    if (isNonEmptyString(station.county)) counties.add(station.county)
    if (isNonEmptyString(station.borough)) allBoroughs.add(station.borough)
    if (isNonEmptyString(station.fareZone)) fareZones.add(station.fareZone)
  }

  return {
    tocs: sortAlphabetically([...tocs]),
    countries: sortAlphabetically([...countries]),
    counties: sortAlphabetically([...counties]),
    allBoroughs: sortAlphabetically([...allBoroughs]),
    fareZones: sortAlphabetically([...fareZones]),
  }
}

/** Borough values that appear on stations in the given counties. */
export const getBoroughsForCounties = (
  stations: Station[],
  counties: readonly string[]
): string[] =>
  sortAlphabetically([
    ...new Set(
      stations
        .filter((station) => counties.includes(station.county || ''))
        .map((station) => station.borough)
        .filter(isNonEmptyString)
    ),
  ])

/** Borough DDM options scoped to the current county selection. */
export const getBoroughOptionsForCountySelection = (
  stations: Station[],
  selectedCounties: readonly string[],
  allCounties: readonly string[]
): string[] => {
  if (!shouldApplyCategoryFilter([...selectedCounties], [...allCounties])) {
    return sortAlphabetically([
      ...new Set(stations.map((station) => station.borough).filter(isNonEmptyString)),
    ])
  }

  return getBoroughsForCounties(stations, selectedCounties)
}

/** Borough DDM positions that should be disabled for the current county selection. */
export const getDisabledBoroughPositions = (
  allBoroughs: readonly string[],
  enabledBoroughs: readonly string[]
): number[] => {
  const enabledSet = new Set(enabledBoroughs)

  return allBoroughs.reduce<number[]>((positions, borough, index) => {
    if (!enabledSet.has(borough)) positions.push(index)
    return positions
  }, [])
}
/** Borough selections to apply when the county filter changes. */
export const getBoroughSelectionsForCountyChange = (
  stations: Station[],
  selectedCounties: readonly string[],
  allCounties: readonly string[],
  allBoroughs: readonly string[]
): string[] => {
  if (!shouldApplyCategoryFilter([...selectedCounties], [...allCounties])) {
    return [...allBoroughs]
  }

  return getBoroughsForCounties(stations, selectedCounties)
}

export const getDefaultStationFilterSelections = (
  options: StationFilterOptions
): StationFilterSelections => ({
  tocs: options.tocs,
  countries: options.countries,
  counties: options.counties,
  boroughs: options.allBoroughs,
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
  const filtersIdle =
    normalizedSearchTerm.length === 0 &&
    !shouldApplyCategoryFilter(selections.tocs, options.tocs) &&
    !shouldApplyCategoryFilter(selections.countries, options.countries) &&
    !shouldApplyCategoryFilter(selections.counties, options.counties) &&
    !shouldApplyCategoryFilter(selections.boroughs, options.allBoroughs) &&
    !shouldApplyCategoryFilter(selections.fareZones, options.fareZones)

  // Default “all selected” + empty search — skip O(n) scan on large lists.
  if (filtersIdle) return stations

  const boroughOptions = getBoroughOptionsForCountySelection(
    stations,
    selections.counties,
    options.counties
  )

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

    const boroughMatch =
      !shouldApplyCategoryFilter(selections.boroughs, boroughOptions) ||
      (isNonEmptyString(station.borough) &&
        boroughLabelMatchesSelection(station.borough, selections.boroughs))

    const fareZoneMatch =
      !shouldApplyCategoryFilter(selections.fareZones, options.fareZones) ||
      selections.fareZones.includes(station.fareZone || '')

    return (
      searchTermMatch &&
      tocMatch &&
      countryMatch &&
      countyMatch &&
      boroughMatch &&
      fareZoneMatch
    )
  })
}

export const sortStations = (stations: Station[], sortOption: SortOption): Station[] => {
  if (stations.length <= 1) return stations

  // CDN list rows are typically name-asc already — avoid a full copy+sort when possible.
  if (sortOption === 'name-asc') {
    let alreadySorted = true
    for (let i = 1; i < stations.length; i += 1) {
      const prev = stations[i - 1]?.stationName || ''
      const next = stations[i]?.stationName || ''
      if (prev.localeCompare(next) > 0) {
        alreadySorted = false
        break
      }
    }
    if (alreadySorted) return stations
  }

  return [...stations].sort((a, b) => {
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
}