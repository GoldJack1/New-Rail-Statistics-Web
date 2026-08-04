import type { Station } from '@/types'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import { parseStoredDateForSort } from '@/utils/dateDdMmYyyy'
import { isGreaterLondonCounty, resolveProvinceForDisplay, usesProvinceLocaleFormat } from '@/utils/formatStationLocation'
import { boroughLabelMatchesSelection } from '@/utils/londonBoroughs'
import {
  getLatestYearlyPassengerCount,
  getYearlyPassengerCountForYear,
} from '@/utils/yearlyPassengers'
import { compareStationsByDateOpened } from '@/utils/stationDateOpenedSort'
import { getStationTocForDisplay } from '@/utils/stationCardForNetwork'
import type { StationsTableSort } from '@/utils/stationsTableColumns'

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'passengers-asc'
  | 'passengers-desc'
  | 'toc-asc'
  | 'toc-desc'
  | 'date-opened-asc'
  | 'date-opened-desc'

/** Card-mode passenger sort: per-station latest year, or a specific YYYY. */
export type PassengerSortYear = 'latest' | string

export function isPassengerSortYear(value: unknown): value is PassengerSortYear {
  return value === 'latest' || (typeof value === 'string' && /^\d{4}$/.test(value))
}

export interface StationFilterOptions {
  tocs: string[]
  countries: string[]
  counties: string[]
  /** All borough values shown in the Borough filter DDM. */
  allBoroughs: string[]
  /** Unique provinces for Irish Rail / NI Translink stops. */
  provinces: string[]
  /** Unique Date Opened values (chronological), mainly SuperTram. */
  dateOpened: string[]
  fareZones: string[]
}

export interface StationFilterSelections {
  tocs: string[]
  countries: string[]
  counties: string[]
  /** Selected boroughs in the Borough filter DDM. */
  boroughs: string[]
  /** Selected provinces (Irish Rail / NI Translink). */
  provinces: string[]
  /** Selected Date Opened values. */
  dateOpened: string[]
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

const sortDateOpenedChronologically = (values: string[]) =>
  [...values].sort((a, b) => {
    const aMs = parseStoredDateForSort(a)
    const bMs = parseStoredDateForSort(b)
    if (aMs == null && bMs == null) return a.localeCompare(b, undefined, { sensitivity: 'base' })
    if (aMs == null) return 1
    if (bMs == null) return -1
    return aMs - bMs
  })

const shouldApplyCategoryFilter = (selected: string[], allOptions: string[]) =>
  selected.length !== allOptions.length

const getLatestPassengers = (station: Station): number =>
  getLatestYearlyPassengerCount(station.yearlyPassengers) ?? 0

const getPassengersForCardSort = (
  station: Station,
  passengerYear: PassengerSortYear
): number => {
  if (passengerYear !== 'latest') {
    return getYearlyPassengerCountForYear(station.yearlyPassengers, passengerYear) ?? 0
  }
  return getLatestPassengers(station)
}

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
    case 'date-opened-asc':
      return { column: 'dateOpened', direction: 'asc' }
    case 'date-opened-desc':
      return { column: 'dateOpened', direction: 'desc' }
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
  if (sort.column === 'dateOpened') {
    return sort.direction === 'desc' ? 'date-opened-desc' : 'date-opened-asc'
  }
  return null
}

export const getStationFilterOptions = (stations: Station[]): StationFilterOptions => {
  const tocs = new Set<string>()
  const countries = new Set<string>()
  const counties = new Set<string>()
  const allBoroughs = new Set<string>()
  const provinces = new Set<string>()
  const dateOpened = new Set<string>()
  const fareZones = new Set<string>()

  for (const station of stations) {
    const toc = getStationTocForDisplay(station)
    if (isNonEmptyString(toc)) tocs.add(toc)
    if (isNonEmptyString(station.country)) countries.add(station.country)
    if (isNonEmptyString(station.county)) counties.add(station.county)
    if (isNonEmptyString(station.borough)) allBoroughs.add(station.borough)
    if (usesProvinceLocaleFormat(station)) {
      const province = resolveProvinceForDisplay(station)
      if (province) provinces.add(province)
    }
    if (isNonEmptyString(station.dateOpened)) dateOpened.add(station.dateOpened.trim())
    if (isNonEmptyString(station.fareZone)) fareZones.add(station.fareZone)
  }

  return {
    tocs: sortAlphabetically([...tocs]),
    countries: sortAlphabetically([...countries]),
    counties: sortAlphabetically([...counties]),
    allBoroughs: sortAlphabetically([...allBoroughs]),
    provinces: sortAlphabetically([...provinces]),
    dateOpened: sortDateOpenedChronologically([...dateOpened]),
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
  provinces: options.provinces,
  dateOpened: options.dateOpened,
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
    !shouldApplyCategoryFilter(selections.provinces, options.provinces) &&
    !shouldApplyCategoryFilter(selections.dateOpened, options.dateOpened) &&
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
      selections.tocs.includes(getStationTocForDisplay(station))
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

    const provinceMatch =
      !shouldApplyCategoryFilter(selections.provinces, options.provinces) ||
      selections.provinces.includes(resolveProvinceForDisplay(station))

    const dateOpenedMatch =
      !shouldApplyCategoryFilter(selections.dateOpened, options.dateOpened) ||
      selections.dateOpened.includes((station.dateOpened || '').trim())

    const fareZoneMatch =
      !shouldApplyCategoryFilter(selections.fareZones, options.fareZones) ||
      selections.fareZones.includes(station.fareZone || '')

    return (
      searchTermMatch &&
      tocMatch &&
      countryMatch &&
      countyMatch &&
      boroughMatch &&
      provinceMatch &&
      dateOpenedMatch &&
      fareZoneMatch
    )
  })
}

export const sortStations = (
  stations: Station[],
  sortOption: SortOption,
  options: { passengerYear?: PassengerSortYear } = {}
): Station[] => {
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

  const passengerYear = options.passengerYear ?? 'latest'
  const isPassengerSort =
    sortOption === 'passengers-asc' || sortOption === 'passengers-desc'
  const list =
    isPassengerSort && passengerYear !== 'latest'
      ? stations.filter(
          (station) =>
            getYearlyPassengerCountForYear(station.yearlyPassengers, passengerYear) != null
        )
      : stations

  if (list.length <= 1) return list

  return [...list].sort((a, b) => {
    switch (sortOption) {
      case 'name-asc':
        return (a.stationName || '').localeCompare(b.stationName || '')
      case 'name-desc':
        return (b.stationName || '').localeCompare(a.stationName || '')
      case 'toc-asc':
        return getStationTocForDisplay(a).localeCompare(getStationTocForDisplay(b))
      case 'toc-desc':
        return getStationTocForDisplay(b).localeCompare(getStationTocForDisplay(a))
      case 'passengers-asc':
        return getPassengersForCardSort(a, passengerYear) - getPassengersForCardSort(b, passengerYear)
      case 'passengers-desc':
        return getPassengersForCardSort(b, passengerYear) - getPassengersForCardSort(a, passengerYear)
      case 'date-opened-asc':
        return compareStationsByDateOpened(a, b, 'asc')
      case 'date-opened-desc':
        return compareStationsByDateOpened(a, b, 'desc')
      default:
        return 0
    }
  })
}