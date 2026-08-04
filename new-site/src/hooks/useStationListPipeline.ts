import { useDeferredValue, useMemo } from 'react'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import { isStationIncludedInAllNetworkView } from '@/constants/stationCollections'
import type { PendingChangeEntry } from '@/contexts/pendingStationChangesTypes'
import type { Station } from '@/types'
import { mergePendingChangesForStationsList } from '@/utils/applyPendingChangesForDisplay'
import {
  filterStations,
  getDefaultStationFilterSelections,
  getStationFilterOptions,
  sortStations,
  type PassengerSortYear,
  type SortOption,
  type StationFilterSelections,
  type StationSearchMode,
} from '@/utils/stationSearchFiltering'
import {
  sortStationsByTableColumn,
  type StationsTableSort,
} from '@/utils/stationsTableColumns'
import type { StationAdminDisplayMode } from '@/utils/stationAdminDisplayModeStorage'

export interface StationListPipelineInput {
  loadedStations: Station[]
  pendingChanges: Record<string, PendingChangeEntry>
  networkView: NetworkViewFilter
  debouncedSearchTerm: string
  searchMode: StationSearchMode
  filterSelections: StationFilterSelections
  hasUserInteractedWithFilters: boolean
  sortOption: SortOption
  /** Card-mode only: which passenger year to sort by. */
  passengerSortYear?: PassengerSortYear
  tableSort: StationsTableSort
  adminDisplayMode: StationAdminDisplayMode
}

export interface StationListPipelineResult {
  stations: Station[]
  uniqueValues: ReturnType<typeof getStationFilterOptions>
  defaultSelections: StationFilterSelections
  effectiveSelections: StationFilterSelections
  filteredStations: Station[]
  sortedStations: Station[]
}

export function useStationListPipeline({
  loadedStations,
  pendingChanges,
  networkView,
  debouncedSearchTerm,
  searchMode,
  filterSelections,
  hasUserInteractedWithFilters,
  sortOption,
  passengerSortYear = 'latest',
  tableSort,
  adminDisplayMode,
}: StationListPipelineInput): StationListPipelineResult {
  const stations = useMemo(() => {
    const baseStations =
      networkView === 'all'
        ? loadedStations.filter((station) =>
            isStationIncludedInAllNetworkView(station.sourceCollectionId)
          )
        : loadedStations.filter((station) => station.sourceCollectionId === networkView)

    return mergePendingChangesForStationsList(baseStations, pendingChanges, networkView)
  }, [loadedStations, networkView, pendingChanges])

  // Keep filter-option scans / list transforms off the urgent path after large CDN loads.
  // When the network tab changes, skip the deferred snapshot so cards don't briefly show
  // the previous network (or filters applied against the wrong station set).
  const deferredStations = useDeferredValue(stations)
  const deferredNetworkView = useDeferredValue(networkView)
  const stationsForList =
    deferredNetworkView === networkView ? deferredStations : stations

  const uniqueValues = useMemo(
    () => getStationFilterOptions(stationsForList || []),
    [stationsForList]
  )
  const defaultSelections = useMemo(
    () => getDefaultStationFilterSelections(uniqueValues),
    [uniqueValues]
  )
  const effectiveSelections = hasUserInteractedWithFilters ? filterSelections : defaultSelections

  const filteredStations = useMemo(
    () =>
      filterStations(
        stationsForList || [],
        debouncedSearchTerm,
        effectiveSelections,
        uniqueValues,
        searchMode
      ),
    [stationsForList, debouncedSearchTerm, effectiveSelections, uniqueValues, searchMode]
  )

  const sortedStations = useMemo(() => {
    if (adminDisplayMode === 'table') {
      return sortStationsByTableColumn(filteredStations, tableSort)
    }
    return sortStations(filteredStations, sortOption, { passengerYear: passengerSortYear })
  }, [filteredStations, sortOption, passengerSortYear, adminDisplayMode, tableSort])

  return {
    stations,
    uniqueValues,
    defaultSelections,
    effectiveSelections,
    filteredStations,
    sortedStations,
  }
}
