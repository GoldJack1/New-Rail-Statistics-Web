'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import React, { useState, useMemo, useCallback, useEffect, useSyncExternalStore } from 'react'
import { CaretLeft, CaretRight, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'

import { useStations } from '@/hooks/useStations'
import { useStationListPipeline } from '@/hooks/useStationListPipeline'
import { useDebounce } from '@/hooks/useDebounce'
import {
  BUTLeftRoundedCircleButton,
  BUTOperatorChip,
  BUTRightRoundedCircleButton,
  BUTSquareButton,
  BUTTextNumberSquareButton,
  TOGToggleVisited,
  BUTWideButton,
} from '@/components/buttons'
import { PageTopHeader } from '@/components/misc'
import BUTDDMList from '@/components/buttons/ddm/BUTDDMList'
import BUTDDMListActionDual from '@/components/buttons/ddm/BUTDDMListActionDual'
import StationCard from '@/components/cards/StationCard/StationCard'
import LightRailStopCard from '@/components/cards/LightRailStopCard/LightRailStopCard'
import StationsTableView from '@/components/cards/StationsTableView/StationsTableView'
import StationsTableColumnsModal from '@/components/cards/StationsTableView/StationsTableColumnsModal'
import { isLightRailStop } from '@/utils/stationCardForNetwork'
import StationAdminControls from '@/components/cards/StationAdminControls/StationAdminControls'
import StationAdminViewControls from '@/components/cards/StationAdminControls/StationAdminViewControls'
import NetworkStationTabGroup from '@/components/cards/NetworkStationTabGroup/NetworkStationTabGroup'
import { formatStationLocationDisplay } from '@/utils/formatStationLocation'
import { NETWORK_COLLECTION_IDS } from '@/constants/stationCollections'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import { countPendingChangesForCollection } from '@/utils/pendingChangesByCollection'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { usePendingStationChanges } from '@/contexts/PendingStationChangesContext'
import { buildStationPath, getStationMapKey } from '@/utils/stationAreaSlug'
import { pathnameForReviewPendingSource } from '@/utils/reviewPendingNavigation'
import { useStationAdminMode } from '@/hooks/useStationAdminMode'
import { useStationCollectionFieldSchema } from '@/hooks/useStationCollectionFieldSchema'
import {
  readStationAdminDisplayMode,
  writeStationAdminDisplayMode,
  STATION_ADMIN_DISPLAY_MODE_CHANGED_EVENT,
  type StationAdminDisplayMode,
} from '@/utils/stationAdminDisplayModeStorage'
import {
  getDefaultTableColumnSlots,
  getTableFieldSchemaForNetworkView,
  type StationsTableColumnSlot,
} from '@/utils/stationsTableColumnCatalog'
import {
  type StationsTableSort,
} from '@/utils/stationsTableColumns'
import {
  isOnlyGreaterLondonSelected,
  type SortOption,
  type StationFilterSelections,
  type StationSearchMode,
  getAvailableStationSearchModes,
  getStationSearchPlaceholder,
  normalizeStationSearchInput,
} from '@/utils/stationSearchFiltering'
import './StationsPageRefactored.css'
import TXTINPBUTIconWideButtonSearch from '@/components/textInputButtons/special/TXTINPBUTIconWideButtonSearch'

interface StationsPageProps {
  initialMode?: 'view' | 'edit'
}

const SORT_DDM_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: 'Name (A-Z)', value: 'name-asc' },
  { label: 'Name (Z-A)', value: 'name-desc' },
  { label: 'TOC (A-Z)', value: 'toc-asc' },
  { label: 'TOC (Z-A)', value: 'toc-desc' },
  { label: 'Passengers (Low-High)', value: 'passengers-asc' },
  { label: 'Passengers (High-Low)', value: 'passengers-desc' },
]

const StationsPage: React.FC<StationsPageProps> = ({ initialMode = 'view' }) => {
  const { stations: loadedStations, loading, error, refetch } = useStations()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routerLocation = { pathname, search: searchParams.toString() ? `?${searchParams}` : '' }
  const [searchTerm, setSearchTerm] = useState('')
  const [searchMode, setSearchMode] = useState<StationSearchMode>('name')
  const [filterSelections, setFilterSelections] = useState<StationFilterSelections>({
    tocs: [],
    countries: [],
    counties: [],
    boroughs: [],
    allBoroughs: [],
    fareZones: [],
  })
  const [hasUserInteractedWithFilters, setHasUserInteractedWithFilters] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('name-asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [isEditMode, setIsEditMode] = useState<boolean>(initialMode === 'edit')
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(false)
  const [isMobileSortExpanded, setIsMobileSortExpanded] = useState(false)
  const [tableSort, setTableSort] = useState<StationsTableSort>({ column: 'name', direction: 'asc' })
  const [isTableColumnsModalOpen, setIsTableColumnsModalOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth
  )
  const { collectionId, networkView, setNetworkView } = useStationCollection()
  const [tableColumnSlots, setTableColumnSlots] = useState<StationsTableColumnSlot[]>(() =>
    getDefaultTableColumnSlots(networkView)
  )
  const { pendingChanges } = usePendingStationChanges()
  const isAdminMode = useStationAdminMode()
  const subscribeDisplayMode = useCallback((onStoreChange: () => void) => {
    window.addEventListener(STATION_ADMIN_DISPLAY_MODE_CHANGED_EVENT, onStoreChange)
    return () => window.removeEventListener(STATION_ADMIN_DISPLAY_MODE_CHANGED_EVENT, onStoreChange)
  }, [])
  const getDisplayModeSnapshot = useCallback(() => readStationAdminDisplayMode(), [])
  const storedDisplayMode = useSyncExternalStore(subscribeDisplayMode, getDisplayModeSnapshot, () => 'cards' as const)
  const adminDisplayMode: StationAdminDisplayMode = storedDisplayMode
  const isMobileStationsLayout = viewportWidth < 640
  const effectiveDisplayMode: StationAdminDisplayMode = isMobileStationsLayout ? 'cards' : adminDisplayMode
  const handleDisplayModeChange = useCallback((mode: StationAdminDisplayMode) => {
    if (isMobileStationsLayout && mode === 'table') return
    writeStationAdminDisplayMode(mode)
  }, [isMobileStationsLayout])
  const pendingChangesCount = useMemo(() => {
    if (networkView === 'all') {
      return NETWORK_COLLECTION_IDS.reduce(
        (sum, id) => sum + countPendingChangesForCollection(pendingChanges, id),
        0
      )
    }
    return countPendingChangesForCollection(pendingChanges, collectionId)
  }, [pendingChanges, collectionId, networkView])
  const isAdminPanelVisible = initialMode === 'edit' || isAdminMode
  const tableHeaderSchemaCollectionId = useMemo(() => {
    if (networkView === 'all') return null
    return networkView
  }, [networkView])
  const { fieldSchema: tableHeaderFieldSchema, loading: tableHeaderSchemaLoading } =
    useStationCollectionFieldSchema(tableHeaderSchemaCollectionId)
  const tableHeaderFieldSchemaForModal = useMemo(() => {
    if (networkView === 'all') {
      return getTableFieldSchemaForNetworkView('all')
    }
    if (tableHeaderSchemaLoading) {
      return getTableFieldSchemaForNetworkView(networkView)
    }
    return tableHeaderFieldSchema
  }, [networkView, tableHeaderSchemaLoading, tableHeaderFieldSchema])

  useEffect(() => {
    if (initialMode === 'edit' || isAdminMode) {
      setIsEditMode(true)
      return
    }
    setIsEditMode(false)
  }, [initialMode, isAdminMode])

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

  useEffect(() => {
    setSearchMode((current) => (availableSearchModes.includes(current) ? current : 'name'))
  }, [availableSearchModes])

  useEffect(() => {
    setSearchTerm((current) => normalizeStationSearchInput(current, searchMode))
  }, [searchMode])

  const {
    uniqueValues,
    defaultSelections,
    effectiveSelections,
    sortedStations,
    boroughFilterEnabled,
  } = useStationListPipeline({
    loadedStations,
    pendingChanges,
    networkView,
    debouncedSearchTerm,
    searchMode,
    filterSelections,
    hasUserInteractedWithFilters,
    sortOption,
    tableSort,
    adminDisplayMode: effectiveDisplayMode,
  })

  const CARD_ITEMS_PER_PAGE = 24
  const TABLE_ITEMS_PER_PAGE = 100
  const itemsPerPage = effectiveDisplayMode === 'table' ? TABLE_ITEMS_PER_PAGE : CARD_ITEMS_PER_PAGE
  const totalPages = Math.ceil(sortedStations.length / itemsPerPage)
  const paginatedStations = sortedStations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const tableStations = paginatedStations
  const handleStationNavigate = useCallback(
    (station: (typeof sortedStations)[number]) => {
      router.push(isEditMode ? `/admin/stations/${buildStationPath(station, collectionId)}/edit` : `/stations/${buildStationPath(station, collectionId)}`)
    },
    [router, collectionId, isEditMode]
  )
  const visiblePaginationItems = useMemo(() => {
    const windowSize = viewportWidth < 640 ? 3 : viewportWidth < 1024 ? 5 : 7
    const trailingPagesCount = 3

    if (totalPages <= windowSize + trailingPagesCount) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(windowSize / 2)
    let start = Math.max(1, currentPage - halfWindow)
    let end = Math.min(totalPages, start + windowSize - 1)

    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1)
    }

    const currentWindow = Array.from({ length: end - start + 1 }, (_, index) => start + index)
    const lastPagesStart = Math.max(1, totalPages - trailingPagesCount + 1)
    const lastThreePages = Array.from(
      { length: totalPages - lastPagesStart + 1 },
      (_, index) => lastPagesStart + index
    )
    const mergedPages = Array.from(new Set([...currentWindow, ...lastThreePages])).sort((a, b) => a - b)

    const items: Array<number | 'ellipsis'> = []
    mergedPages.forEach((page, index) => {
      const prev = mergedPages[index - 1]
      if (typeof prev === 'number' && page - prev > 1) {
        items.push('ellipsis')
      }
      items.push(page)
    })

    return items
  }, [currentPage, totalPages, viewportWidth])

  const updateFilterSelection = useCallback(
    (key: keyof StationFilterSelections, selectedItems: string[]) => {
      setFilterSelections((prev) => {
        const baseSelections = hasUserInteractedWithFilters ? prev : defaultSelections
        const next = { ...baseSelections, [key]: selectedItems }
        if (key === 'counties') {
          if (isOnlyGreaterLondonSelected(selectedItems)) {
            next.boroughs = uniqueValues.boroughs
          } else {
            next.boroughs = []
          }
        }
        return next
      })
      setHasUserInteractedWithFilters(true)
    },
    [defaultSelections, hasUserInteractedWithFilters, uniqueValues.boroughs]
  )

  const getSelectedPositions = (items: string[], selectedItems: string[]) =>
    selectedItems
      .map((item) => items.indexOf(item))
      .filter((index) => index >= 0)

  const toggleLondonBoroughFilter = useCallback(() => {
    if (boroughFilterEnabled) {
      updateFilterSelection('counties', defaultSelections.counties)
      return
    }
    updateFilterSelection('counties', ['Greater London'])
  }, [defaultSelections.counties, boroughFilterEnabled, updateFilterSelection])

  const resetAllFilters = useCallback(() => {
    setFilterSelections({
      tocs: [],
      countries: [],
      counties: [],
      boroughs: [],
      allBoroughs: [],
      fareZones: [],
    })
    setHasUserInteractedWithFilters(false)
  }, [])

  const sortControls = (
    <div className="sort-section">
      <BUTDDMList
        items={SORT_DDM_OPTIONS.map((option) => option.label)}
        filterName="Sort"
        selectionMode="single"
        selectedPositions={[Math.max(0, SORT_DDM_OPTIONS.findIndex((option) => option.value === sortOption))]}
        onSelectionChanged={(selectedPositions) => {
          const selectedIndex = selectedPositions[0]
          if (typeof selectedIndex !== 'number') return
          const selectedSortOption = SORT_DDM_OPTIONS[selectedIndex]
          if (selectedSortOption) {
            setSortOption(selectedSortOption.value)
          }
        }}
        colorVariant="primary"
      />
    </div>
  )

  const filterControls = (
    <div className="filters-grid">
      <div className="filter-group">
        <label className="filter-label">TOC</label>
        <BUTDDMListActionDual
          items={uniqueValues.tocs}
          filterName="TOCs"
          selectionMode="multi"
          selectedPositions={getSelectedPositions(uniqueValues.tocs, effectiveSelections.tocs)}
          onSelectionChanged={(_, selectedItems) => updateFilterSelection('tocs', selectedItems)}
          colorVariant="primary"
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Country</label>
        <BUTDDMListActionDual
          items={uniqueValues.countries}
          filterName="Countries"
          selectionMode="multi"
          selectedPositions={getSelectedPositions(uniqueValues.countries, effectiveSelections.countries)}
          onSelectionChanged={(_, selectedItems) => updateFilterSelection('countries', selectedItems)}
          colorVariant="primary"
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">County</label>
        <BUTDDMListActionDual
          items={uniqueValues.counties}
          filterName="Counties"
          selectionMode="multi"
          selectedPositions={getSelectedPositions(uniqueValues.counties, effectiveSelections.counties)}
          onSelectionChanged={(_, selectedItems) => updateFilterSelection('counties', selectedItems)}
          colorVariant="primary"
        />
      </div>

      {uniqueValues.otherBoroughs.length > 0 && (
        <div className="filter-group">
          <label className="filter-label">Borough</label>
          <BUTDDMListActionDual
            items={uniqueValues.otherBoroughs}
            filterName="Boroughs"
            selectionMode="multi"
            selectedPositions={getSelectedPositions(uniqueValues.otherBoroughs, effectiveSelections.allBoroughs)}
            onSelectionChanged={(_, selectedItems) => updateFilterSelection('allBoroughs', selectedItems)}
            colorVariant="primary"
          />
        </div>
      )}

      <div className="filter-group">
        <div className="county-london-toggle">
          <span className="county-london-toggle__label">London Borough Filter</span>
          <TOGToggleVisited
            checked={boroughFilterEnabled}
            onChange={() => toggleLondonBoroughFilter()}
            ariaLabel="London Borough Filter"
            className="county-london-toggle__control"
          />
        </div>
      </div>

      {boroughFilterEnabled && (
        <div className="filter-group">
          <label className="filter-label">London Borough</label>
          <BUTDDMListActionDual
            items={uniqueValues.boroughs}
            filterName="London Boroughs"
            selectionMode="multi"
            selectedPositions={getSelectedPositions(uniqueValues.boroughs, effectiveSelections.boroughs)}
            onSelectionChanged={(_, selectedItems) => updateFilterSelection('boroughs', selectedItems)}
            colorVariant="primary"
          />
        </div>
      )}

      {isAdminMode && (
        <div className="filter-group">
          <label className="filter-label">Fare Zone</label>
          <BUTDDMListActionDual
            items={uniqueValues.fareZones}
            filterName="Fare Zones"
            selectionMode="multi"
            selectedPositions={getSelectedPositions(uniqueValues.fareZones, effectiveSelections.fareZones)}
            onSelectionChanged={(_, selectedItems) => updateFilterSelection('fareZones', selectedItems)}
            colorVariant="primary"
          />
        </div>
      )}
    </div>
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, effectiveSelections, sortOption, collectionId, networkView, tableSort, effectiveDisplayMode])

  useEffect(() => {
    setTableColumnSlots(getDefaultTableColumnSlots(networkView))
  }, [networkView])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  if (loading) {
    return (
      <div className="stations-page">
        <div className="stations-loading">
          <div className="loading-spinner"></div>
          <p>Loading stations. This may take a few moments.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stations-page">
        <div className="stations-error">
          <WarningCircle className="error-icon" aria-hidden />
          <h2>Failed to load stations</h2>
          <p>{error}</p>
          <BUTWideButton onClick={() => refetch()} width="hug">
            Try Again
          </BUTWideButton>
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'stations-page',
        effectiveDisplayMode === 'table' ? 'stations-page--table-mode' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PageTopHeader
        title="Station Database"
        subtitle={
          isEditMode
            ? 'View or edit station fields and prepare changes for publishing'
            : 'Explore railway stations and passenger data'
        }
      />
      <div
        className={[
          'stations-toolbar-band',
          !isAdminPanelVisible ? 'stations-toolbar-band--desktop-only' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="stations-network-tabs-wrap stations-network-tabs-wrap--toolbar">
          <NetworkStationTabGroup
            value={networkView}
            onChange={(view: NetworkViewFilter) => setNetworkView(view)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="stations-content">
        {/* Sidebar */}
        <aside className="stations-sidebar">
          {isAdminPanelVisible && (
            <div className="sidebar-section stations-sidebar-admin-section">
              <h2 className="sidebar-section-title stations-sidebar-panel-section__title">Admin</h2>
              <StationAdminControls
                isEditMode={isEditMode}
                pendingChangesCount={pendingChangesCount}
                onModeChange={(mode) => setIsEditMode(mode === 'edit')}
                onOpenPendingChanges={() =>
                  router.push(
                    `/admin/stations/pending-review?from=${encodeURIComponent(pathnameForReviewPendingSource(routerLocation))}`
                  )
                }
                onAddStation={() => router.push('/admin/stations/new')}
                className="station-admin-controls-card--sidebar"
              />
            </div>
          )}
          <div className="sidebar-section stations-sidebar-view-section">
            <h2 className="sidebar-section-title stations-sidebar-panel-section__title">View</h2>
            <StationAdminViewControls
              displayMode={effectiveDisplayMode}
              onDisplayModeChange={handleDisplayModeChange}
              onAssignHeaders={() => setIsTableColumnsModalOpen(true)}
              tableModeDisabled={isMobileStationsLayout}
              className="station-admin-controls-card--sidebar"
            />
          </div>
          {/* Search + Filters + Sort */}
          <div className="sidebar-section">
            <h2 className="sidebar-section-title sidebar-section-title--subsection">Search</h2>
            <div className="search-container">
              <TXTINPBUTIconWideButtonSearch
                id="stations-search"
                name="station-search"
                icon={<MagnifyingGlass size={16} aria-hidden />}
                value={searchTerm}
                onChange={(value) => setSearchTerm(normalizeStationSearchInput(value, searchMode))}
                onClear={() => setSearchTerm('')}
                className="search-input-shell"
                placeholder={getStationSearchPlaceholder(searchMode)}
                autoComplete="off"
                colorVariant="primary"
                showClear
              />
            </div>
            {availableSearchModes.length > 1 ? (
              <div className="stations-search-mode-chips" role="group" aria-label="Search by">
                {availableSearchModes.map((mode) => (
                  <BUTOperatorChip
                    key={mode}
                    instantAction
                    colorVariant="primary"
                    width="hug"
                    state={searchMode === mode ? 'pressed' : 'active'}
                    onClick={() => setSearchMode(mode)}
                    aria-label={
                      mode === 'name'
                        ? 'Search by station name'
                        : mode === 'crs'
                          ? 'Search by CRS code'
                          : 'Search by TIPLOC code'
                    }
                  >
                    {mode === 'name' ? 'Name' : mode === 'crs' ? 'CRS' : 'TIPLOC'}
                  </BUTOperatorChip>
                ))}
              </div>
            ) : null}
            <div className="search-filters-spacer" aria-hidden="true" />
            <h2 className="sidebar-section-title sidebar-section-title--subsection stations-mobile-sort-heading">
              Sort
            </h2>
            <div className="mobile-filters-toggle-row">
              <BUTWideButton
                type="button"
                width="fill"
                className="mobile-filters-toggle"
                onClick={() => setIsMobileSortExpanded((prev) => !prev)}
                aria-expanded={isMobileSortExpanded}
                aria-controls="stations-mobile-only-sort"
              >
                {isMobileSortExpanded ? 'Hide Sort' : 'Show Sort'}
              </BUTWideButton>
              <BUTWideButton
                type="button"
                width="fill"
                className="mobile-filters-toggle"
                onClick={() => setIsMobileFiltersExpanded((prev) => !prev)}
                aria-expanded={isMobileFiltersExpanded}
                aria-controls="stations-mobile-only-filters"
              >
                {isMobileFiltersExpanded ? 'Hide Filters' : 'Show Filters'}
              </BUTWideButton>
            </div>
            <div className="stations-network-tabs-wrap stations-network-tabs-wrap--mobile">
              <h2 className="sidebar-section-title sidebar-section-title--subsection">Network</h2>
              <NetworkStationTabGroup
                value={networkView}
                onChange={(view: NetworkViewFilter) => setNetworkView(view)}
              />
            </div>

            <div
              id="stations-mobile-only-sort"
              className={`mobile-filters-content mobile-filters-content--sort ${isMobileSortExpanded ? 'mobile-filters-content--expanded' : ''}`}
            >
              <div className="mobile-filters-content-inner">
                <h2 className="sidebar-section-title sidebar-section-title--subsection">Sort</h2>
                {sortControls}
              </div>
            </div>

            <h2 className="sidebar-section-title sidebar-section-title--subsection stations-mobile-filters-heading">
              Filters
            </h2>

            <div
              id="stations-mobile-only-filters"
              className={`mobile-filters-content mobile-filters-content--filters ${isMobileFiltersExpanded ? 'mobile-filters-content--expanded' : ''}`}
            >
              <div className="mobile-filters-content-inner">
                <div className="stations-filters-heading-row">
                  <h2 className="sidebar-section-title sidebar-section-title--subsection">Filters</h2>
                  <BUTWideButton
                    type="button"
                    width="hug"
                    className="stations-reset-filters-button"
                    onClick={resetAllFilters}
                    disabled={!hasUserInteractedWithFilters}
                  >
                    Reset all
                  </BUTWideButton>
                </div>
                {filterControls}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="stations-main">
          {effectiveDisplayMode === 'table' ? (
            <StationsTableView
              stations={tableStations}
              sort={tableSort}
              onSortChange={setTableSort}
              onRowClick={handleStationNavigate}
              columnSlots={tableColumnSlots}
            />
          ) : (
            <div className="stations-page-grid">
              {paginatedStations.map((station) => {
                const cardProps = {
                  station,
                  locationDisplay: formatStationLocationDisplay(station),
                  onCardClick: () => handleStationNavigate(station),
                  onInfoClick: () => handleStationNavigate(station),
                }
                return isLightRailStop(station) ? (
                  <LightRailStopCard key={getStationMapKey(station)} {...cardProps} />
                ) : (
                  <StationCard key={getStationMapKey(station)} {...cardProps} />
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="stations-pagination">
              <div className="pagination-control-row">
                <BUTLeftRoundedCircleButton
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  ariaLabel="Previous page"
                  icon={<CaretLeft size={16} />}
                />
                <div className="pagination-page-buttons">
                  {visiblePaginationItems.map((item, index) => (
                    item === 'ellipsis' ? (
                      <BUTSquareButton
                        key={`ellipsis-${index}`}
                        type="button"
                        ariaLabel="More pages"
                      >
                        ...
                      </BUTSquareButton>
                    ) : (
                      <BUTTextNumberSquareButton
                        key={item}
                        type="button"
                        text={String(item)}
                        pressed={item === currentPage}
                        onClick={() => setCurrentPage(item)}
                        ariaLabel={`Go to page ${item}`}
                      />
                    )
                  ))}
                </div>
                <BUTRightRoundedCircleButton
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  ariaLabel="Next page"
                  icon={<CaretRight size={16} />}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      <StationsTableColumnsModal
        open={isTableColumnsModalOpen}
        slots={tableColumnSlots}
        networkView={networkView}
        fieldSchema={tableHeaderFieldSchemaForModal}
        onApply={setTableColumnSlots}
        onClose={() => setIsTableColumnsModalOpen(false)}
      />
    </div>
  )
}

export default StationsPage