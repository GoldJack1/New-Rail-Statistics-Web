'use client'

import dynamic from 'next/dynamic'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, useDeferredValue } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlass, WarningCircle } from '@/components/icons'

import { useStations } from '@/hooks/useStations'
import { useStationListPipeline } from '@/hooks/useStationListPipeline'
import { useDebounce } from '@/hooks/useDebounce'
import BUTLeftRoundedCircleButton from '@/components/buttons/small/BUTLeftRoundedCircleButton'
import BUTRightRoundedCircleButton from '@/components/buttons/small/BUTRightRoundedCircleButton'
import BUTSquareButton from '@/components/buttons/small/BUTSquareButton'
import BUTTextNumberSquareButton from '@/components/buttons/small/BUTTextNumberSquareButton'
import BUTWideButton from '@/components/buttons/wide/BUTWideButton'
import BUTOperatorChip from '@/components/buttons/wide/BUTOperatorChip'
import TOGToggleVisited from '@/components/buttons/toggle/TOGToggleVisited'
import { PageTopHeader } from '@/components/misc'
import SidebarDropdownSection from '@/components/misc/SidebarDropdownSection/SidebarDropdownSection'
import BUTDDMList from '@/components/buttons/ddm/BUTDDMList'
import BUTDDMListActionDual from '@/components/buttons/ddm/BUTDDMListActionDual'
import StationCard from '@/components/cards/StationCard/StationCard'
import LightRailStopCard from '@/components/cards/LightRailStopCard/LightRailStopCard'
import StationsCardGridSkeleton from '@/components/cards/StationsCardGridSkeleton/StationsCardGridSkeleton'
import { isLightRailStop } from '@/utils/stationCardForNetwork'
import NetworkStationTabGroup from '@/components/cards/NetworkStationTabGroup/NetworkStationTabGroup'
import { formatStationLocationDisplay, isGreaterLondonCounty } from '@/utils/formatStationLocation'
import { NETWORK_COLLECTION_IDS, DEFAULT_NETWORK_VIEW } from '@/constants/stationCollections'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import { countPendingChangesForCollection } from '@/utils/pendingChangesByCollection'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { usePendingStationChanges } from '@/contexts/PendingStationChangesContext.shared'
import { buildStationPath, getStationMapKey } from '@/utils/stationAreaSlug'
import { pathnameForReviewPendingSource } from '@/utils/reviewPendingNavigation'
import { useStationAdminMode } from '@/hooks/useStationAdminMode'
import {
  useStationAdminDisplayMode,
} from '@/hooks/useStationAdminDisplayMode'
import { useStationAdminSidebarSections } from '@/hooks/useStationAdminSidebarSections'
import { useStationCollectionFieldSchema } from '@/hooks/useStationCollectionFieldSchema'
import { getStationNetworkView } from '@/utils/stationCollectionStorage'
import {
  writeStationAdminDisplayMode,
  type StationAdminDisplayMode,
} from '@/utils/stationAdminDisplayModeStorage'
import type { StationAdminSidebarSectionsState } from '@/utils/stationAdminSidebarSectionsStorage'
import { DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS } from '@/utils/stationAdminSidebarSectionsStorage'
import {
  getDefaultTableColumnSlots,
  getTableFieldSchemaForNetworkView,
  type StationsTableColumnSlot,
} from '@/utils/stationsTableColumnCatalog'
import {
  type StationsTableSort,
} from '@/utils/stationsTableColumns'
import {
  type SortOption,
  sortOptionToTableSort,
  tableSortToSortOption,
  type StationFilterSelections,
  type StationSearchMode,
  getAvailableStationSearchModes,
  getBoroughOptionsForCountySelection,
  getBoroughSelectionsForCountyChange,
  getBoroughsForCounties,
  getDisabledBoroughPositions,
  getStationSearchPlaceholder,
  isOnlyGreaterLondonSelected,
  normalizeStationSearchInput,
} from '@/utils/stationSearchFiltering'
import './StationsPageRefactored.css'
import TXTINPBUTIconWideButtonSearch from '@/components/textInputButtons/special/TXTINPBUTIconWideButtonSearch'

const StationsTableView = dynamic(
  () => import('@/components/cards/StationsTableView/StationsTableView'),
  { loading: () => <StationsCardGridSkeleton count={24} /> }
)
const StationsTableColumnsModal = dynamic(
  () => import('@/components/cards/StationsTableView/StationsTableColumnsModal'),
  { ssr: false }
)
const StationAdminControls = dynamic(
  () => import('@/components/cards/StationAdminControls/StationAdminControls')
)
const StationAdminViewControls = dynamic(
  () => import('@/components/cards/StationAdminControls/StationAdminViewControls')
)

const WHISTLESTOP_KIRKLEES_TOC = 'Whistlestop Valley/Kirklees Light Railway'

/** Minimum time the loading skeleton stays visible so fast cache hits do not flash. */
const MIN_SKELETON_MS = 1500
/** Minimum skeleton time when switching network tabs. */
const MIN_NETWORK_TAB_SKELETON_MS = 1000

const formatTocFilterDdmLabel = (toc: string) =>
  toc === WHISTLESTOP_KIRKLEES_TOC ? 'Whistlestop Valley/Kirklees Light Rlwy' : toc

interface StationsPageProps {
  initialMode?: 'view' | 'edit'
  initialDisplayMode?: StationAdminDisplayMode
  initialNetworkView?: NetworkViewFilter
  initialSidebarSections?: StationAdminSidebarSectionsState
  /** Minimum skeleton display time; 0 shows content as soon as data is ready (public browse). */
  minSkeletonMs?: number
}

const SORT_DDM_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: 'Name (A-Z)', value: 'name-asc' },
  { label: 'Name (Z-A)', value: 'name-desc' },
  { label: 'TOC (A-Z)', value: 'toc-asc' },
  { label: 'TOC (Z-A)', value: 'toc-desc' },
  { label: 'Passengers (Low-High)', value: 'passengers-asc' },
  { label: 'Passengers (High-Low)', value: 'passengers-desc' },
]

const StationsPageClient: React.FC<StationsPageProps> = ({
  initialMode = 'view',
  initialDisplayMode = 'cards',
  initialNetworkView = DEFAULT_NETWORK_VIEW,
  initialSidebarSections,
  minSkeletonMs = MIN_SKELETON_MS,
}) => {
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
    fareZones: [],
  })
  const [hasUserInteractedWithFilters, setHasUserInteractedWithFilters] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('name-asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [isEditMode, setIsEditMode] = useState<boolean>(initialMode === 'edit')
  const [tableSort, setTableSort] = useState<StationsTableSort>({ column: 'name', direction: 'asc' })
  const [isTableColumnsModalOpen, setIsTableColumnsModalOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [viewportMeasured, setViewportMeasured] = useState(false)
  const [minSkeletonElapsed, setMinSkeletonElapsed] = useState(() => minSkeletonMs <= 0)
  const [networkTabSkeletonActive, setNetworkTabSkeletonActive] = useState(false)
  const isInitialNetworkViewRef = useRef(true)
  const { collectionId, networkView, setNetworkView } = useStationCollection()
  const effectiveNetworkView = useMemo(() => {
    if (networkView !== DEFAULT_NETWORK_VIEW) {
      return networkView
    }
    return typeof window !== 'undefined' ? getStationNetworkView() : initialNetworkView
  }, [networkView, initialNetworkView])
  const [tableColumnSlots, setTableColumnSlots] = useState<StationsTableColumnSlot[]>(() =>
    getDefaultTableColumnSlots(
      typeof window !== 'undefined' ? getStationNetworkView() : initialNetworkView
    )
  )
  const effectiveTableColumnSlots = useMemo(() => {
    if (networkView === effectiveNetworkView) {
      return tableColumnSlots
    }
    return getDefaultTableColumnSlots(effectiveNetworkView)
  }, [networkView, effectiveNetworkView, tableColumnSlots])
  const { pendingChanges } = usePendingStationChanges()
  const isAdminMode = useStationAdminMode()
  const adminDisplayMode = useStationAdminDisplayMode(initialDisplayMode)
  const { sections: sidebarSections, setSectionExpanded } = useStationAdminSidebarSections(
    initialSidebarSections ?? DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS
  )
  const isMobileStationsLayout = viewportMeasured && viewportWidth < 640
  const showSidebarViewSection = viewportMeasured && viewportWidth >= 640
  const effectiveDisplayMode: StationAdminDisplayMode =
    !viewportMeasured || isMobileStationsLayout ? 'cards' : adminDisplayMode
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
    if (effectiveDisplayMode !== 'table' && !isTableColumnsModalOpen) return null
    if (networkView === 'all') return null
    return networkView
  }, [networkView, effectiveDisplayMode, isTableColumnsModalOpen])
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
    () => getAvailableStationSearchModes(effectiveNetworkView),
    [effectiveNetworkView]
  )
  const showSearchModeChips = availableSearchModes.length > 1

  useEffect(() => {
    setSearchMode((current) => (availableSearchModes.includes(current) ? current : 'name'))
  }, [availableSearchModes])

  useEffect(() => {
    setSearchTerm((current) => normalizeStationSearchInput(current, searchMode))
  }, [searchMode])

  const deferredLoadedStations = useDeferredValue(loadedStations)

  const {
    stations,
    uniqueValues,
    defaultSelections,
    effectiveSelections,
    sortedStations,
  } = useStationListPipeline({
    loadedStations: deferredLoadedStations,
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

  const CARD_ITEMS_PER_PAGE = 24
  const CARD_ROWS_AT_THREE_COLUMNS = CARD_ITEMS_PER_PAGE / 3
  const CARD_EXTRA_ROWS_AT_THREE_COLUMNS = 5
  const TABLE_ITEMS_PER_PAGE = 100
  // Enough ghost rows to fill the viewport without rendering a full 100-row page.
  const TABLE_SKELETON_ROW_COUNT = 25
  const stationsPageGridRef = useRef<HTMLDivElement>(null)
  const [cardColumnCount, setCardColumnCount] = useState(1)

  const updateCardColumnCount = useCallback(() => {
    const grid = stationsPageGridRef.current
    if (!grid) return
    const template = window.getComputedStyle(grid).gridTemplateColumns
    const columnCount = template.split(' ').filter((track) => track.trim().length > 0).length
    setCardColumnCount((current) => {
      const next = Math.max(1, columnCount)
      return current === next ? current : next
    })
  }, [])

  useLayoutEffect(() => {
    if (effectiveDisplayMode !== 'cards') return
    updateCardColumnCount()
  }, [effectiveDisplayMode, updateCardColumnCount, sortedStations.length])

  useEffect(() => {
    if (effectiveDisplayMode !== 'cards') return

    updateCardColumnCount()
    const grid = stationsPageGridRef.current
    if (!grid) return

    const observer = new ResizeObserver(() => {
      updateCardColumnCount()
    })
    observer.observe(grid)
    window.addEventListener('resize', updateCardColumnCount)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateCardColumnCount)
    }
  }, [effectiveDisplayMode, updateCardColumnCount])

  const cardItemsPerPage = useMemo(() => {
    if (cardColumnCount === 3) {
      return (CARD_ROWS_AT_THREE_COLUMNS + CARD_EXTRA_ROWS_AT_THREE_COLUMNS) * 3
    }
    return CARD_ITEMS_PER_PAGE
  }, [cardColumnCount])

  const itemsPerPage = effectiveDisplayMode === 'table' ? TABLE_ITEMS_PER_PAGE : cardItemsPerPage
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
        return { ...baseSelections, [key]: selectedItems }
      })
      setHasUserInteractedWithFilters(true)
    },
    [defaultSelections, hasUserInteractedWithFilters]
  )

  const getSelectedPositions = (items: string[], selectedItems: string[]) =>
    selectedItems
      .map((item) => items.indexOf(item))
      .filter((index) => index >= 0)

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
    [
      defaultSelections,
      hasUserInteractedWithFilters,
      stations,
      uniqueValues.counties,
    ]
  )

  const toggleLondonBoroughFilter = useCallback(() => {
    const greaterLondonCounty = uniqueValues.counties.find((county) => isGreaterLondonCounty(county))
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
    setFilterSelections({
      tocs: [],
      countries: [],
      counties: [],
      boroughs: [],
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
            setTableSort(sortOptionToTableSort(selectedSortOption.value))
          }
        }}
        colorVariant="primary"
      />
    </div>
  )

  const filterControls = (
    <div className="filters-panel">
      <div className="filter-group">
        <label className="filter-label">TOC</label>
        <BUTDDMListActionDual
          items={uniqueValues.tocs}
          filterName="TOCs"
          selectionMode="multi"
          selectedPositions={getSelectedPositions(uniqueValues.tocs, effectiveSelections.tocs)}
          onSelectionChanged={(_, selectedItems) => updateFilterSelection('tocs', selectedItems)}
          formatItemLabel={formatTocFilterDdmLabel}
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
          onSelectionChanged={(_, selectedItems) => updateCountySelection(selectedItems)}
          colorVariant="primary"
        />
      </div>

      {uniqueValues.allBoroughs.length > 0 && (
        <div className="filter-group">
          <label className="filter-label">Borough</label>
          <BUTDDMListActionDual
            items={uniqueValues.allBoroughs}
            filterName="Boroughs"
            selectionMode="multi"
            selectedPositions={getSelectedPositions(uniqueValues.allBoroughs, effectiveSelections.boroughs)}
            disabledPositions={disabledBoroughPositions}
            preferCountWhenAllSelected={londonBoroughFilterEnabled}
            onSelectionChanged={(_, selectedItems) => updateFilterSelection('boroughs', selectedItems)}
            colorVariant="primary"
          />
        </div>
      )}

      <div className="filter-group filter-group--london-borough">
        <div className="county-london-toggle">
          <span className="filter-label county-london-toggle__label">London Borough Filter</span>
          <TOGToggleVisited
            checked={londonBoroughFilterEnabled}
            onChange={() => toggleLondonBoroughFilter()}
            ariaLabel="London Borough Filter"
            className="county-london-toggle__control"
          />
        </div>
      </div>

      <div className="filters-panel__footer">
        <BUTWideButton
          type="button"
          width="fill"
          className="stations-reset-filters-button"
          onClick={resetAllFilters}
          disabled={!hasUserInteractedWithFilters}
        >
          Reset all
        </BUTWideButton>
      </div>
    </div>
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, effectiveSelections, sortOption, collectionId, networkView, tableSort, effectiveDisplayMode, cardItemsPerPage])

  useLayoutEffect(() => {
    setTableColumnSlots(getDefaultTableColumnSlots(getStationNetworkView()))
    setViewportWidth(window.innerWidth)
    setViewportMeasured(true)
  }, [])

  useEffect(() => {
    setTableColumnSlots(getDefaultTableColumnSlots(networkView))
  }, [networkView])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (minSkeletonMs <= 0) {
      setMinSkeletonElapsed(true)
      return
    }

    const timer = window.setTimeout(() => setMinSkeletonElapsed(true), minSkeletonMs)
    return () => window.clearTimeout(timer)
  }, [minSkeletonMs])

  useEffect(() => {
    if (isInitialNetworkViewRef.current) {
      isInitialNetworkViewRef.current = false
      return
    }

    setNetworkTabSkeletonActive(true)
    const timer = window.setTimeout(
      () => setNetworkTabSkeletonActive(false),
      MIN_NETWORK_TAB_SKELETON_MS
    )
    return () => window.clearTimeout(timer)
  }, [effectiveNetworkView])

  const showMainSkeleton =
    !error && (loading || (minSkeletonMs > 0 && !minSkeletonElapsed) || networkTabSkeletonActive)
  const showMainError = Boolean(error)
  const showMainContent = !showMainSkeleton && !showMainError
  const sidebarShowsLoadingChrome = showMainSkeleton && minSkeletonMs > 0

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
      <div className="stations-toolbar-band">
        <div className="stations-network-tabs-wrap stations-network-tabs-wrap--toolbar">
          <NetworkStationTabGroup
            value={effectiveNetworkView}
            onChange={(view: NetworkViewFilter) => setNetworkView(view)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="stations-content">
        {/* Sidebar */}
        <aside
          className={['stations-sidebar', sidebarShowsLoadingChrome ? 'stations-sidebar--loading' : '']
            .filter(Boolean)
            .join(' ')}
          aria-busy={sidebarShowsLoadingChrome}
          aria-disabled={sidebarShowsLoadingChrome}
        >
          <div className="stations-sidebar-panel">
          <SidebarDropdownSection
            title="Search"
            expanded={sidebarSections.search}
            onExpandedChange={(expanded) => setSectionExpanded('search', expanded)}
          >
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
            {showSearchModeChips && (
              <div className="stations-search-mode-chips-reveal">
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
              </div>
            )}
          </SidebarDropdownSection>

          {showSidebarViewSection && (
            <SidebarDropdownSection
              title="View"
              className="stations-sidebar-view-section"
              expanded={sidebarSections.view}
              onExpandedChange={(expanded) => setSectionExpanded('view', expanded)}
            >
              <StationAdminViewControls
                displayMode={effectiveDisplayMode}
                onDisplayModeChange={handleDisplayModeChange}
                onAssignHeaders={() => setIsTableColumnsModalOpen(true)}
                className="station-admin-controls-card--sidebar"
              />
            </SidebarDropdownSection>
          )}

          <SidebarDropdownSection
            title="Sort"
            expanded={sidebarSections.sort}
            onExpandedChange={(expanded) => setSectionExpanded('sort', expanded)}
          >
            {sortControls}
          </SidebarDropdownSection>

          <SidebarDropdownSection
            title="Filters"
            expanded={sidebarSections.filters}
            onExpandedChange={(expanded) => setSectionExpanded('filters', expanded)}
          >
            {filterControls}
          </SidebarDropdownSection>

          {isAdminPanelVisible && (
            <SidebarDropdownSection
              title="Admin"
              expanded={sidebarSections.admin}
              onExpandedChange={(expanded) => setSectionExpanded('admin', expanded)}
            >
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
                fareZoneOptions={isAdminMode ? uniqueValues.fareZones : undefined}
                selectedFareZonePositions={
                  isAdminMode
                    ? getSelectedPositions(uniqueValues.fareZones, effectiveSelections.fareZones)
                    : []
                }
                onFareZoneSelectionChange={
                  isAdminMode
                    ? (selectedItems) => updateFilterSelection('fareZones', selectedItems)
                    : undefined
                }
                className="station-admin-controls-card--sidebar"
              />
            </SidebarDropdownSection>
          )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="stations-main" aria-busy={showMainSkeleton}>
          {showMainError ? (
            <div className="stations-main-error" role="alert">
              <WarningCircle className="stations-main-error__icon" aria-hidden />
              <h2 className="stations-main-error__title">Failed to load stations</h2>
              <p className="stations-main-error__message">{error}</p>
              <BUTWideButton onClick={() => refetch()} width="hug">
                Try Again
              </BUTWideButton>
            </div>
          ) : showMainSkeleton ? (
            effectiveDisplayMode === 'table' ? (
              <StationsTableView
                stations={[]}
                sort={tableSort}
                onSortChange={setTableSort}
                onRowClick={() => {}}
                columnSlots={effectiveTableColumnSlots}
                isLoading
                skeletonRowCount={TABLE_SKELETON_ROW_COUNT}
              />
            ) : (
              <StationsCardGridSkeleton count={CARD_ITEMS_PER_PAGE} />
            )
          ) : effectiveDisplayMode === 'table' ? (
            <StationsTableView
              stations={tableStations}
              sort={tableSort}
              onSortChange={(sort) => {
                setTableSort(sort)
                const mappedSortOption = tableSortToSortOption(sort)
                if (mappedSortOption) {
                  setSortOption(mappedSortOption)
                }
              }}
              onRowClick={handleStationNavigate}
              columnSlots={effectiveTableColumnSlots}
            />
          ) : (
            <div className="stations-page-grid" ref={stationsPageGridRef}>
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
          {showMainContent && totalPages > 1 && (
            <div className="stations-pagination">
              <div className="pagination-control-row">
                <BUTLeftRoundedCircleButton
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  ariaLabel="Previous page"
                  icon={<ChevronLeftIcon />}
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
                  icon={<ChevronRightIcon />}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {isTableColumnsModalOpen ? (
        <StationsTableColumnsModal
          open={isTableColumnsModalOpen}
          slots={tableColumnSlots}
          networkView={networkView}
          fieldSchema={tableHeaderFieldSchemaForModal}
          onApply={setTableColumnSlots}
          onClose={() => setIsTableColumnsModalOpen(false)}
        />
      ) : null}
    </div>
  )
}

export default StationsPageClient