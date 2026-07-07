import { useMemo } from 'react'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import type { PendingChangeEntry } from '@/contexts/PendingStationChangesContext'
import type { Station } from '@/types'
import { mergePendingChangesForStationsList } from '@/utils/applyPendingChangesForDisplay'
import {
  filterStations,
  getDefaultStationFilterSelections,
  getStationFilterOptions,
  isOnlyGreaterLondonSelected,
  sortStations,
  type SortOption,
  type StationFilterSelections,
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
  isSandbox: boolean
  debouncedSearchTerm: string
  filterSelections: StationFilterSelections
  hasUserInteractedWithFilters: boolean
  sortOption: SortOption
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
  boroughFilterEnabled: boolean
}

export function useStationListPipeline({
  loadedStations,
  pendingChanges,
  networkView,
  isSandbox,
  debouncedSearchTerm,
  filterSelections,
  hasUserInteractedWithFilters,
  sortOption,
  tableSort,
  adminDisplayMode,
}: StationListPipelineInput): StationListPipelineResult {
  const stations = useMemo(() => {
    const baseStations =
      isSandbox || networkView === 'all'
        ? loadedStations
        : loadedStations.filter((station) => station.sourceCollectionId === networkView)

    return mergePendingChangesForStationsList(baseStations, pendingChanges, networkView)
  }, [loadedStations, isSandbox, networkView, pendingChanges])

  const uniqueValues = useMemo(() => getStationFilterOptions(stations || []), [stations])
  const defaultSelections = useMemo(
    () => getDefaultStationFilterSelections(uniqueValues),
    [uniqueValues]
  )
  const effectiveSelections = hasUserInteractedWithFilters ? filterSelections : defaultSelections

  const filteredStations = useMemo(
    () => filterStations(stations || [], debouncedSearchTerm, effectiveSelections, uniqueValues),
    [stations, debouncedSearchTerm, effectiveSelections, uniqueValues]
  )

  const sortedStations = useMemo(() => {
    if (adminDisplayMode === 'table') {
      return sortStationsByTableColumn(filteredStations, tableSort)
    }
    return sortStations(filteredStations, sortOption)
  }, [filteredStations, sortOption, adminDisplayMode, tableSort])

  const boroughFilterEnabled = isOnlyGreaterLondonSelected(effectiveSelections.counties)

  return {
    stations,
    uniqueValues,
    defaultSelections,
    effectiveSelections,
    filteredStations,
    sortedStations,
    boroughFilterEnabled,
  }
}
