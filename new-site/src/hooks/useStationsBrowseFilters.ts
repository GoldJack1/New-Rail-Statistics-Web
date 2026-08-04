'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PendingChangeEntry } from '@/contexts/pendingStationChangesTypes'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import { useStationListPipeline } from '@/hooks/useStationListPipeline'
import { useDebounce } from '@/hooks/useDebounce'
import { isGreaterLondonCounty } from '@/utils/formatStationLocation'
import { parseLightRailLinesServed } from '@/utils/lightRailStationFields'
import {
  type SortOption,
  type PassengerSortYear,
  sortOptionToTableSort,
  type StationFilterSelections,
  type StationSearchMode,
  getAvailableStationSearchModes,
  getBoroughOptionsForCountySelection,
  getBoroughSelectionsForCountyChange,
  getBoroughsForCounties,
  getDisabledBoroughPositions,
  isOnlyGreaterLondonSelected,
  normalizeStationSearchInput,
} from '@/utils/stationSearchFiltering'
import {
  writeStationsListFiltersState,
  readStationsListFiltersState,
  peekStationsListFiltersStateForRestore,
  finishStationsListFiltersRestore,
  shouldRestoreStationsListFilters,
  type SupertramLineFilter,
  type StationsListFiltersState,
} from '@/utils/stationsListFiltersStorage'
import {
  type StationsTableSort,
} from '@/utils/stationsTableColumns'
import type { StationAdminDisplayMode } from '@/utils/stationAdminDisplayModeStorage'
import { collectYearlyPassengerYears } from '@/utils/yearlyPassengers'
import type { Station } from '@/types'

const SORT_DDM_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: 'Name (A-Z)', value: 'name-asc' },
  { label: 'Name (Z-A)', value: 'name-desc' },
  { label: 'TOC (A-Z)', value: 'toc-asc' },
  { label: 'TOC (Z-A)', value: 'toc-desc' },
  { label: 'Passengers (Low-High)', value: 'passengers-asc' },
  { label: 'Passengers (High-Low)', value: 'passengers-desc' },
  { label: 'Date Opened (Oldest-Newest)*', value: 'date-opened-asc' },
  { label: 'Date Opened (Newest-Oldest)*', value: 'date-opened-desc' },
]

const DATE_OPENED_SORT_NETWORK_VIEWS = new Set<NetworkViewFilter>([
  'all',
  'lightrail_GBSHEFFSUPERTRAM',
])

const NETWORKS_WITHOUT_PASSENGERS_SORT = new Set<NetworkViewFilter>([
  'stations_roiirerail',
  'stations_nitranslink',
  'stations_gbheritage',
])

const NETWORKS_WITHOUT_TOC_SORT = new Set<NetworkViewFilter>([
  'stations_roiirerail',
  'stations_nitranslink',
])

const isDateOpenedSortOption = (value: SortOption) =>
  value === 'date-opened-asc' || value === 'date-opened-desc'

export const isPassengersSortOption = (value: SortOption) =>
  value === 'passengers-asc' || value === 'passengers-desc'

const isTocSortOption = (value: SortOption) => value === 'toc-asc' || value === 'toc-desc'

export const PASSENGER_SORT_YEAR_LATEST_LABEL = 'Latest'

export { SORT_DDM_OPTIONS, isDateOpenedSortOption }

const EMPTY_FILTER_SELECTIONS: StationFilterSelections = {
  tocs: [],
  countries: [],
  counties: [],
  boroughs: [],
  provinces: [],
  dateOpened: [],
  fareZones: [],
}

export interface UseStationsBrowseFiltersInput {
  loadedStations: Station[]
  pendingChanges: Record<string, PendingChangeEntry>
  networkView: NetworkViewFilter
  setNetworkView: (view: NetworkViewFilter) => void
  isAdminMode: boolean
  adminDisplayMode: StationAdminDisplayMode
  /** When true, persist/restore currentPage and reset it on filter changes. */
  managePagination?: boolean
  /** Extra deps that should reset currentPage (e.g. cardItemsPerPage). */
  paginationResetDeps?: unknown[]
}

export function useStationsBrowseFilters({
  loadedStations,
  pendingChanges,
  networkView,
  setNetworkView,
  isAdminMode,
  adminDisplayMode,
  managePagination = false,
  paginationResetDeps = [],
}: UseStationsBrowseFiltersInput) {
  const [restoredListFilters] = useState<StationsListFiltersState | null>(() => {
    // Details→list uses a one-shot restore flag. Otherwise keep session filters so
    // list ↔ map share the same Search/Sort/Filters state.
    if (shouldRestoreStationsListFilters()) {
      return peekStationsListFiltersStateForRestore()
    }
    return readStationsListFiltersState()
  })
  const [searchTerm, setSearchTerm] = useState(() => restoredListFilters?.searchTerm ?? '')
  const [searchMode, setSearchMode] = useState<StationSearchMode>(
    () => restoredListFilters?.searchMode ?? 'name'
  )
  const [filterSelections, setFilterSelections] = useState<StationFilterSelections>(
    () => restoredListFilters?.filterSelections ?? { ...EMPTY_FILTER_SELECTIONS }
  )
  const [hasUserInteractedWithFilters, setHasUserInteractedWithFilters] = useState(
    () => restoredListFilters?.hasUserInteractedWithFilters ?? false
  )
  const [sortOption, setSortOption] = useState<SortOption>(
    () => restoredListFilters?.sortOption ?? 'name-asc'
  )
  const [passengerSortYear, setPassengerSortYear] = useState<PassengerSortYear>(
    () => restoredListFilters?.passengerSortYear ?? 'latest'
  )
  const [supertramLineFilter, setSupertramLineFilter] = useState<SupertramLineFilter>(
    () => restoredListFilters?.supertramLineFilter ?? []
  )
  const [supertramFiltersExpanded, setSupertramFiltersExpanded] = useState(false)
  const [irishNiFiltersExpanded, setIrishNiFiltersExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(() => restoredListFilters?.currentPage ?? 1)
  const [tableSort, setTableSort] = useState<StationsTableSort>(
    () => restoredListFilters?.tableSort ?? { column: 'name', direction: 'asc' }
  )
  const skipInitialPageResetRef = useRef(restoredListFilters != null)

  useEffect(() => {
    finishStationsListFiltersRestore()
  }, [])

  useEffect(() => {
    if (!restoredListFilters?.networkView) return
    setNetworkView(restoredListFilters.networkView)
  }, [restoredListFilters, setNetworkView])

  useEffect(() => {
    if (isAdminMode) return
    setFilterSelections((current) =>
      current.fareZones.length === 0 ? current : { ...current, fareZones: [] }
    )
  }, [isAdminMode])

  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const availableSearchModes = useMemo(
    () => getAvailableStationSearchModes(networkView),
    [networkView]
  )
  const showSearchModeChips = availableSearchModes.length > 1

  useEffect(() => {
    setSearchMode((current) => (availableSearchModes.includes(current) ? current : 'name'))
  }, [availableSearchModes])

  useEffect(() => {
    setSearchTerm((current) => normalizeStationSearchInput(current, searchMode))
  }, [searchMode])

  const {
    stations,
    uniqueValues,
    defaultSelections,
    effectiveSelections,
    sortedStations,
  } = useStationListPipeline({
    loadedStations,
    pendingChanges,
    networkView,
    debouncedSearchTerm,
    searchMode,
    filterSelections,
    hasUserInteractedWithFilters,
    sortOption,
    passengerSortYear,
    tableSort,
    adminDisplayMode,
  })

  const enabledBoroughs = useMemo(
    () =>
      getBoroughOptionsForCountySelection(
        stations,
        effectiveSelections.counties,
        uniqueValues.counties
      ),
    [stations, effectiveSelections.counties, uniqueValues.counties]
  )

  const disabledBoroughPositions = useMemo(
    () => getDisabledBoroughPositions(uniqueValues.allBoroughs, enabledBoroughs),
    [uniqueValues.allBoroughs, enabledBoroughs]
  )

  const londonBoroughFilterEnabled = isOnlyGreaterLondonSelected(effectiveSelections.counties)
  const isSupertramNetworkView = networkView === 'lightrail_GBSHEFFSUPERTRAM'
  const showLondonBoroughToggle = useMemo(() => {
    if (isSupertramNetworkView) return false
    if (
      networkView === 'stations_roiirerail' ||
      networkView === 'stations_nitranslink'
    ) {
      return false
    }
    if (networkView === 'stations_gbheritage') {
      return uniqueValues.counties.some((county) => isGreaterLondonCounty(county))
    }
    return true
  }, [networkView, isSupertramNetworkView, uniqueValues.counties])
  const isIrishOrNiNetworkView =
    networkView === 'stations_roiirerail' || networkView === 'stations_nitranslink'
  const showCountryFilter = !isSupertramNetworkView && !isIrishOrNiNetworkView
  const showTocFilter = !isSupertramNetworkView && !isIrishOrNiNetworkView
  const showProvinceFilterInline =
    isIrishOrNiNetworkView && uniqueValues.provinces.length > 0
  const showIrishNiSection = networkView === 'all' && uniqueValues.provinces.length > 0
  const showProvinceFilters = showProvinceFilterInline || showIrishNiSection
  const showSupertramOnlyFilters = isSupertramNetworkView || networkView === 'all'

  const availableSortOptions = useMemo(() => {
    return SORT_DDM_OPTIONS.filter((option) => {
      if (isSupertramNetworkView) {
        return (
          option.value === 'name-asc' ||
          option.value === 'name-desc' ||
          isDateOpenedSortOption(option.value)
        )
      }
      if (isDateOpenedSortOption(option.value)) {
        return DATE_OPENED_SORT_NETWORK_VIEWS.has(networkView)
      }
      if (isPassengersSortOption(option.value)) {
        return !NETWORKS_WITHOUT_PASSENGERS_SORT.has(networkView)
      }
      if (isTocSortOption(option.value)) {
        return !NETWORKS_WITHOUT_TOC_SORT.has(networkView)
      }
      return true
    }).map((option) =>
      isSupertramNetworkView && isDateOpenedSortOption(option.value)
        ? { ...option, label: option.label.replace(/\*$/, '') }
        : option
    )
  }, [networkView, isSupertramNetworkView])

  const visibleStations = useMemo(() => {
    if (!showSupertramOnlyFilters || supertramLineFilter.length === 0) return sortedStations

    return sortedStations.filter((station) => {
      const lines = parseLightRailLinesServed(station.linesServed)
      return supertramLineFilter.some((line) => lines.includes(line))
    })
  }, [showSupertramOnlyFilters, sortedStations, supertramLineFilter])

  const dateOpenedCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const station of stations) {
      const date = station.dateOpened?.trim()
      if (!date) continue
      counts.set(date, (counts.get(date) ?? 0) + 1)
    }
    return counts
  }, [stations])

  const passengerSortYearOptions = useMemo((): PassengerSortYear[] => {
    const years = collectYearlyPassengerYears(stations)
    return years.length > 0 ? ['latest', ...years] : ['latest']
  }, [stations])

  const handleNetworkViewChange = useCallback(
    (view: NetworkViewFilter) => {
      setHasUserInteractedWithFilters(false)
      setFilterSelections({ ...EMPTY_FILTER_SELECTIONS })
      setSupertramLineFilter([])
      setNetworkView(view)
    },
    [setNetworkView]
  )

  const handleResetTableSort = useCallback(() => {
    setSortOption('name-asc')
    setPassengerSortYear('latest')
    setTableSort(sortOptionToTableSort('name-asc'))
  }, [])

  const updateFilterSelection = useCallback(
    (key: keyof StationFilterSelections, selectedItems: string[]) => {
      setFilterSelections((prev) => {
        const baseSelections = hasUserInteractedWithFilters ? prev : defaultSelections
        return { ...baseSelections, [key]: selectedItems }
      })
      setHasUserInteractedWithFilters(true)
    },
    [defaultSelections, hasUserInteractedWithFilters]
  )

  const getSelectedPositions = useCallback((items: string[], selectedItems: string[]) => {
    return selectedItems
      .map((item) => items.indexOf(item))
      .filter((index) => index >= 0)
  }, [])

  const updateCountySelection = useCallback(
    (selectedCounties: string[]) => {
      setFilterSelections((prev) => {
        const baseSelections = hasUserInteractedWithFilters ? prev : defaultSelections
        return {
          ...baseSelections,
          counties: selectedCounties,
          boroughs: getBoroughSelectionsForCountyChange(
            stations,
            selectedCounties,
            uniqueValues.counties,
            defaultSelections.boroughs
          ),
        }
      })
      setHasUserInteractedWithFilters(true)
    },
    [defaultSelections, hasUserInteractedWithFilters, stations, uniqueValues.counties]
  )

  const toggleLondonBoroughFilter = useCallback(() => {
    const greaterLondonCounty = uniqueValues.counties.find((county) =>
      isGreaterLondonCounty(county)
    )
    if (!greaterLondonCounty) return

    setFilterSelections((prev) => {
      const baseSelections = hasUserInteractedWithFilters ? prev : defaultSelections

      if (londonBoroughFilterEnabled) {
        return {
          ...baseSelections,
          counties: defaultSelections.counties,
          boroughs: defaultSelections.boroughs,
        }
      }

      return {
        ...baseSelections,
        counties: [greaterLondonCounty],
        boroughs: getBoroughsForCounties(stations, [greaterLondonCounty]),
      }
    })
    setHasUserInteractedWithFilters(true)
  }, [
    defaultSelections,
    hasUserInteractedWithFilters,
    londonBoroughFilterEnabled,
    stations,
    uniqueValues.counties,
  ])

  const resetAllFilters = useCallback(() => {
    setFilterSelections({ ...EMPTY_FILTER_SELECTIONS })
    setHasUserInteractedWithFilters(false)
    setSupertramLineFilter([])
  }, [])

  const persistFiltersState = useCallback(() => {
    writeStationsListFiltersState({
      searchTerm,
      searchMode,
      filterSelections,
      hasUserInteractedWithFilters,
      sortOption,
      passengerSortYear,
      tableSort,
      supertramLineFilter,
      currentPage: managePagination ? currentPage : 1,
      networkView,
    })
  }, [
    searchTerm,
    searchMode,
    filterSelections,
    hasUserInteractedWithFilters,
    sortOption,
    passengerSortYear,
    tableSort,
    supertramLineFilter,
    currentPage,
    managePagination,
    networkView,
  ])

  useEffect(() => {
    persistFiltersState()
  }, [persistFiltersState])

  useEffect(() => {
    if (!managePagination) return
    if (skipInitialPageResetRef.current) {
      skipInitialPageResetRef.current = false
      return
    }
    setCurrentPage(1)
    // paginationResetDeps intentionally spread for list card page-size resets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    managePagination,
    debouncedSearchTerm,
    effectiveSelections,
    sortOption,
    passengerSortYear,
    networkView,
    tableSort,
    adminDisplayMode,
    supertramLineFilter,
    ...paginationResetDeps,
  ])

  useEffect(() => {
    if (availableSortOptions.some((option) => option.value === sortOption)) return
    setSortOption('name-asc')
    setPassengerSortYear('latest')
    setTableSort(sortOptionToTableSort('name-asc'))
  }, [availableSortOptions, sortOption])

  useEffect(() => {
    if (passengerSortYearOptions.includes(passengerSortYear)) return
    setPassengerSortYear('latest')
  }, [passengerSortYearOptions, passengerSortYear])

  useEffect(() => {
    if (showSupertramOnlyFilters) return
    setSupertramLineFilter([])
    setFilterSelections((current) =>
      current.dateOpened.length === 0 ? current : { ...current, dateOpened: [] }
    )
  }, [showSupertramOnlyFilters])

  useEffect(() => {
    if (showProvinceFilters) return
    setFilterSelections((current) =>
      current.provinces.length === 0 ? current : { ...current, provinces: [] }
    )
  }, [showProvinceFilters])

  return {
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    filterSelections,
    hasUserInteractedWithFilters,
    sortOption,
    setSortOption,
    passengerSortYear,
    setPassengerSortYear,
    supertramLineFilter,
    setSupertramLineFilter,
    supertramFiltersExpanded,
    setSupertramFiltersExpanded,
    irishNiFiltersExpanded,
    setIrishNiFiltersExpanded,
    currentPage,
    setCurrentPage,
    tableSort,
    setTableSort,
    debouncedSearchTerm,
    availableSearchModes,
    showSearchModeChips,
    stations,
    uniqueValues,
    defaultSelections,
    effectiveSelections,
    sortedStations,
    visibleStations,
    enabledBoroughs,
    disabledBoroughPositions,
    londonBoroughFilterEnabled,
    isSupertramNetworkView,
    showLondonBoroughToggle,
    showCountryFilter,
    showTocFilter,
    showProvinceFilterInline,
    showIrishNiSection,
    showSupertramOnlyFilters,
    availableSortOptions,
    dateOpenedCounts,
    passengerSortYearOptions,
    handleNetworkViewChange,
    handleResetTableSort,
    updateFilterSelection,
    getSelectedPositions,
    updateCountySelection,
    toggleLondonBoroughFilter,
    resetAllFilters,
    persistFiltersState,
  }
}
