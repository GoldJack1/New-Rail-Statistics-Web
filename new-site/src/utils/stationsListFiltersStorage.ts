import type { NetworkViewFilter } from '@/constants/stationCollections'
import { isNetworkViewFilter } from '@/constants/stationCollections'
import {
  isPassengerSortYear,
  type PassengerSortYear,
  type SortOption,
  type StationFilterSelections,
  type StationSearchMode,
} from '@/utils/stationSearchFiltering'
import { LIGHT_RAIL_LINE_OPTIONS, type LightRailLineOption } from '@/utils/lightRailStationFields'
import type { StationsTableSort } from '@/utils/stationsTableColumns'

const STATIONS_LIST_FILTERS_SESSION_KEY = 'railstats:stationsListFilters:v1'
const STATIONS_LIST_FILTERS_RESTORE_KEY = 'railstats:stationsListFilters:restore:v1'

/** Selected SuperTram lines. Empty array means All. */
export type SupertramLineFilter = LightRailLineOption[]

const LIGHT_RAIL_LINE_OPTION_SET = new Set<string>(LIGHT_RAIL_LINE_OPTIONS)

/** True when every line is included (UI “All”). */
export function isSupertramLineFilterAll(filter: SupertramLineFilter): boolean {
  return filter.length === 0
}

/** Dedupe, drop invalid lines, and collapse a full selection to All (`[]`). */
export function normalizeSupertramLineFilter(
  lines: readonly string[]
): SupertramLineFilter {
  const unique = LIGHT_RAIL_LINE_OPTIONS.filter((line) => lines.includes(line))
  if (unique.length === 0 || unique.length === LIGHT_RAIL_LINE_OPTIONS.length) {
    return []
  }
  return unique
}

/** Toggle one line; selecting all lines (or clearing the last) returns All. */
export function toggleSupertramLineFilter(
  current: SupertramLineFilter,
  line: LightRailLineOption
): SupertramLineFilter {
  if (isSupertramLineFilterAll(current)) {
    return [line]
  }
  const next = current.includes(line)
    ? current.filter((value) => value !== line)
    : [...current, line]
  return normalizeSupertramLineFilter(next)
}

export type StationsListFiltersState = {
  searchTerm: string
  searchMode: StationSearchMode
  filterSelections: StationFilterSelections
  hasUserInteractedWithFilters: boolean
  sortOption: SortOption
  /** Card-mode passenger year (`latest` or YYYY). */
  passengerSortYear: PassengerSortYear
  tableSort: StationsTableSort
  supertramLineFilter: SupertramLineFilter
  currentPage: number
  networkView: NetworkViewFilter
}

const SORT_OPTIONS = new Set<SortOption>([
  'name-asc',
  'name-desc',
  'passengers-asc',
  'passengers-desc',
  'toc-asc',
  'toc-desc',
  'date-opened-asc',
  'date-opened-desc',
])

const SEARCH_MODES = new Set<StationSearchMode>(['name', 'crs', 'tiploc'])

const EMPTY_FILTER_SELECTIONS: StationFilterSelections = {
  tocs: [],
  countries: [],
  counties: [],
  boroughs: [],
  provinces: [],
  dateOpened: [],
  fareZones: [],
}

/** Survives React Strict Mode double-mount within the same details→list return. */
let restoreSnapshot: StationsListFiltersState | null | undefined

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function parseSupertramLineFilter(value: unknown): SupertramLineFilter | null {
  // Legacy single-select string
  if (typeof value === 'string') {
    if (value === 'all') return []
    if (LIGHT_RAIL_LINE_OPTION_SET.has(value)) {
      return [value as LightRailLineOption]
    }
    return null
  }
  if (!isStringArray(value)) return null
  return normalizeSupertramLineFilter(value)
}

function parseFilterSelections(value: unknown): StationFilterSelections | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (
    !isStringArray(record.tocs) ||
    !isStringArray(record.countries) ||
    !isStringArray(record.counties) ||
    !isStringArray(record.boroughs) ||
    !isStringArray(record.fareZones)
  ) {
    return null
  }

  return {
    tocs: record.tocs,
    countries: record.countries,
    counties: record.counties,
    boroughs: record.boroughs,
    provinces: isStringArray(record.provinces) ? record.provinces : [],
    dateOpened: isStringArray(record.dateOpened) ? record.dateOpened : [],
    fareZones: record.fareZones,
  }
}

function parseTableSort(value: unknown): StationsTableSort | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.column !== 'string') return null
  if (record.direction !== 'asc' && record.direction !== 'desc') return null
  return {
    column: record.column as StationsTableSort['column'],
    direction: record.direction,
  }
}

function parseStoredState(value: unknown): StationsListFiltersState | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>

  const filterSelections = parseFilterSelections(record.filterSelections)
  if (!filterSelections) return null

  if (typeof record.searchTerm !== 'string') return null
  if (typeof record.searchMode !== 'string' || !SEARCH_MODES.has(record.searchMode as StationSearchMode)) {
    return null
  }
  if (typeof record.hasUserInteractedWithFilters !== 'boolean') return null
  if (typeof record.sortOption !== 'string' || !SORT_OPTIONS.has(record.sortOption as SortOption)) {
    return null
  }
  // Older snapshots omit passengerSortYear — default to latest.
  const passengerSortYear: PassengerSortYear = isPassengerSortYear(record.passengerSortYear)
    ? record.passengerSortYear
    : 'latest'
  const tableSort = parseTableSort(record.tableSort)
  if (!tableSort) return null
  const supertramLineFilter = parseSupertramLineFilter(record.supertramLineFilter)
  if (supertramLineFilter === null) return null
  if (typeof record.currentPage !== 'number' || !Number.isFinite(record.currentPage) || record.currentPage < 1) {
    return null
  }
  if (typeof record.networkView !== 'string' || !isNetworkViewFilter(record.networkView)) {
    return null
  }

  return {
    searchTerm: record.searchTerm,
    searchMode: record.searchMode as StationSearchMode,
    filterSelections,
    hasUserInteractedWithFilters: record.hasUserInteractedWithFilters,
    sortOption: record.sortOption as SortOption,
    passengerSortYear,
    tableSort,
    supertramLineFilter,
    currentPage: Math.floor(record.currentPage),
    networkView: record.networkView,
  }
}

export function readStationsListFiltersState(): StationsListFiltersState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STATIONS_LIST_FILTERS_SESSION_KEY)
    if (!raw) return null
    return parseStoredState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeStationsListFiltersState(state: StationsListFiltersState | null): void {
  if (typeof window === 'undefined') return
  try {
    if (!state) {
      sessionStorage.removeItem(STATIONS_LIST_FILTERS_SESSION_KEY)
      return
    }
    sessionStorage.setItem(STATIONS_LIST_FILTERS_SESSION_KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}

/** Mark list UI state to restore after returning from station details. */
export function markStationsListFiltersForRestore(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STATIONS_LIST_FILTERS_RESTORE_KEY, '1')
  } catch {
    /* quota / private mode */
  }
}

/**
 * Read restored list UI state when returning from details.
 * Fresh visits clear any stale stored state and return null.
 * Safe under React Strict Mode double-mount.
 */
export function peekStationsListFiltersStateForRestore(): StationsListFiltersState | null {
  if (restoreSnapshot !== undefined) return restoreSnapshot
  if (typeof window === 'undefined') {
    restoreSnapshot = null
    return null
  }

  try {
    const shouldRestore = sessionStorage.getItem(STATIONS_LIST_FILTERS_RESTORE_KEY) === '1'
    if (!shouldRestore) {
      writeStationsListFiltersState(null)
      restoreSnapshot = null
      return null
    }
    restoreSnapshot = readStationsListFiltersState()
    return restoreSnapshot
  } catch {
    restoreSnapshot = null
    return null
  }
}

/** Clear the one-shot restore flag after the list page has applied it. */
export function finishStationsListFiltersRestore(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STATIONS_LIST_FILTERS_RESTORE_KEY)
  } catch {
    /* ignore */
  }
  restoreSnapshot = undefined
}

export function getDefaultStationsListFiltersState(
  networkView: NetworkViewFilter = 'all'
): StationsListFiltersState {
  return {
    searchTerm: '',
    searchMode: 'name',
    filterSelections: { ...EMPTY_FILTER_SELECTIONS },
    hasUserInteractedWithFilters: false,
    sortOption: 'name-asc',
    passengerSortYear: 'latest',
    tableSort: { column: 'name', direction: 'asc' },
    supertramLineFilter: [],
    currentPage: 1,
    networkView,
  }
}
