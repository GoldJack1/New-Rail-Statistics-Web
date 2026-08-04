'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, useId } from 'react'
import dynamic from 'next/dynamic'
import { CaretLeft as ChevronLeftIcon, CaretRight as ChevronRightIcon, Check, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'

import { useStations } from '@/hooks/useStations'
import { useStationListPipeline } from '@/hooks/useStationListPipeline'
import { useDebounce } from '@/hooks/useDebounce'
import {
  BUTLeftRoundedCircleButton,
  BUTOperatorChip,
  BUTRightRoundedCircleButton,
  BUTSquareButton,
  BUTTextNumberSquareButton,
  BUTWideButton,
} from '@/components/buttons'
import PageTopHeader from '@/components/misc/PageTopHeader/PageTopHeader'
import SidebarDropdownSection from '@/components/misc/SidebarDropdownSection/SidebarDropdownSection'
import CollapsibleSection from '@/components/misc/CollapsibleSection/CollapsibleSection'
import { SidebarPanel } from '@/components/misc/SidebarPanel'
import StationCard from '@/components/cards/StationCard/StationCard'
import LightRailStopCard from '@/components/cards/LightRailStopCard/LightRailStopCard'
import StationsCardGridSkeleton from '@/components/cards/StationsCardGridSkeleton/StationsCardGridSkeleton'
import { isLightRailStop } from '@/utils/stationCardForNetwork'
import { collectYearlyPassengerYears } from '@/utils/yearlyPassengers'
import NetworkStationTabGroup from '@/components/cards/NetworkStationTabGroup/NetworkStationTabGroup'
import { formatStationLocationDisplay, isGreaterLondonCounty } from '@/utils/formatStationLocation'
import { DEFAULT_NETWORK_VIEW, ALL_VIEW_NETWORK_COLLECTION_IDS } from '@/constants/stationCollections'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import { countPendingChangesForCollection } from '@/utils/pendingChangesByCollection'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { usePendingStationChanges } from '@/hooks/usePendingStationChanges'
import { buildStationPath, getStationMapKey } from '@/utils/stationAreaSlug'
import { pathnameForReviewPendingSource } from '@/utils/reviewPendingNavigation'
import { setStationDetailsNavigationState } from '@/utils/clientNavigationState'
import { useStationAdminMode } from '@/hooks/useStationAdminMode'
import {
  useStationAdminDisplayMode,
} from '@/hooks/useStationAdminDisplayMode'
import { useStationAdminSidebarSections } from '@/hooks/useStationAdminSidebarSections'
import { getStationNetworkView } from '@/utils/stationCollectionStorage'
import {
  writeStationAdminDisplayMode,
  type StationAdminDisplayMode,
} from '@/utils/stationAdminDisplayModeStorage'
import {
  readStationCardShowOpenedOn,
  writeStationCardShowOpenedOn,
} from '@/utils/stationCardShowOpenedOnStorage'
import type { StationAdminSidebarSectionsState } from '@/utils/stationAdminSidebarSectionsStorage'
import { DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS } from '@/utils/stationAdminSidebarSectionsStorage'
import {
  filterTableColumnSlotsToAllowedKeys,
  getAvailableTableColumnKeys,
  getDefaultTableColumnSlots,
  getTableFieldSchemaForNetworkView,
  type StationsTableColumnSlot,
} from '@/utils/stationsTableColumnCatalog'
import {
  type StationsTableSort,
} from '@/utils/stationsTableColumns'
import {
  type SortOption,
  type PassengerSortYear,
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
import {
  parseLightRailLinesServed,
} from '@/utils/lightRailStationFields'
import {
  writeStationsListFiltersState,
  peekStationsListFiltersStateForRestore,
  finishStationsListFiltersRestore,
  markStationsListFiltersForRestore,
  type SupertramLineFilter,
  type StationsListFiltersState,
} from '@/utils/stationsListFiltersStorage'
import './StationsPageRefactored.css'
import TXTINPBUTIconWideButtonSearch from '@/components/textInputButtons/special/TXTINPBUTIconWideButtonSearch'

const StationsTableView = dynamic(
  () => import('@/components/cards/StationsTableView/StationsTableView'),
  { ssr: false }
)
const StationsTableColumnsModal = dynamic(
  () => import('@/components/cards/StationsTableView/StationsTableColumnsModal'),
  { ssr: false }
)
const StationAdminControls = dynamic(
  () => import('@/components/cards/StationAdminControls/StationAdminControls'),
  { ssr: false }
)
const StationAdminViewControls = dynamic(
  () => import('@/components/cards/StationAdminControls/StationAdminViewControls'),
  { ssr: false }
)
const BUTDDMList = dynamic(() => import('@/components/buttons/ddm/BUTDDMList'), { ssr: false })
const BUTDDMListActionDual = dynamic(
  () => import('@/components/buttons/ddm/BUTDDMListActionDual'),
  { ssr: false }
)
const TOGToggleVisited = dynamic(
  () => import('@/components/buttons/toggle/TOGToggleVisited'),
  { ssr: false }
)
const StationsLineFilterTabs = dynamic(
  () => import('./StationsLineFilterTabs'),
  { ssr: false }
)

const WHISTLESTOP_KIRKLEES_TOC = 'Whistlestop Valley/Kirklees Light Railway'

/** Minimum time the loading skeleton stays visible so fast cache hits do not flash. */
const MIN_SKELETON_MS = 1500
/** Minimum skeleton time when switching network tabs. */
const MIN_NETWORK_TAB_SKELETON_MS = 1000

const formatTocFilterDdmLabel = (toc: string) =>
  toc === WHISTLESTOP_KIRKLEES_TOC ? 'Whistlestop Valley/Kirklees Light Rlwy' : toc

interface StationsPageProps {
  /** Public list defers auth/table/admin chunks; admin keeps full editing surface. */
  surface?: 'public' | 'admin'
  initialMode?: 'view' | 'edit'
  initialDisplayMode?: StationAdminDisplayMode
  initialNetworkView?: NetworkViewFilter
  initialSidebarSections?: StationAdminSidebarSectionsState
}

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

const isPassengersSortOption = (value: SortOption) =>
  value === 'passengers-asc' || value === 'passengers-desc'

const isTocSortOption = (value: SortOption) => value === 'toc-asc' || value === 'toc-desc'

const PASSENGER_SORT_YEAR_LATEST_LABEL = 'Latest'

const StationsPageClient: React.FC<StationsPageProps> = ({
  surface = 'admin',
  initialMode = 'view',
  initialDisplayMode = 'cards',
  initialNetworkView = DEFAULT_NETWORK_VIEW,
  initialSidebarSections,
}) => {
  const { stations: loadedStations, loading, error, refetch } = useStations()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routerLocation = { pathname, search: searchParams.toString() ? `?${searchParams}` : '' }
  const [restoredListFilters] = useState<StationsListFiltersState | null>(() =>
    peekStationsListFiltersStateForRestore()
  )
  const [searchTerm, setSearchTerm] = useState(() => restoredListFilters?.searchTerm ?? '')
  const [searchMode, setSearchMode] = useState<StationSearchMode>(
    () => restoredListFilters?.searchMode ?? 'name'
  )
  const [filterSelections, setFilterSelections] = useState<StationFilterSelections>(
    () =>
      restoredListFilters?.filterSelections ?? {
        tocs: [],
        countries: [],
        counties: [],
        boroughs: [],
        provinces: [],
        dateOpened: [],
        fareZones: [],
      }
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
  const [showOpenedOn, setShowOpenedOn] = useState(() =>
    typeof window !== 'undefined' ? readStationCardShowOpenedOn() : true
  )
  const supertramFiltersPanelId = useId()
  const irishNiFiltersPanelId = useId()
  const [currentPage, setCurrentPage] = useState(() => restoredListFilters?.currentPage ?? 1)
  const [isEditMode, setIsEditMode] = useState<boolean>(initialMode === 'edit')
  const [tableSort, setTableSort] = useState<StationsTableSort>(
    () => restoredListFilters?.tableSort ?? { column: 'name', direction: 'asc' }
  )
  const [isTableColumnsModalOpen, setIsTableColumnsModalOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [viewportMeasured, setViewportMeasured] = useState(false)
  const [minSkeletonElapsed, setMinSkeletonElapsed] = useState(false)
  const [networkTabSkeletonActive, setNetworkTabSkeletonActive] = useState(false)
  const isInitialNetworkViewRef = useRef(true)
  const skipInitialPageResetRef = useRef(restoredListFilters != null)
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
  const { pendingChanges } = usePendingStationChanges()
  const isAdminMode = useStationAdminMode()
  const tableHeaderFieldSchemaForModal = useMemo(
    () => getTableFieldSchemaForNetworkView(networkView),
    [networkView]
  )
  const effectiveTableColumnSlots = useMemo(() => {
    const slots =
      networkView === effectiveNetworkView
        ? tableColumnSlots
        : getDefaultTableColumnSlots(effectiveNetworkView)
    if (isAdminMode) return slots
    const allowedKeys = getAvailableTableColumnKeys(
      effectiveNetworkView,
      getTableFieldSchemaForNetworkView(effectiveNetworkView),
      { isAdminMode: false }
    )
    return filterTableColumnSlotsToAllowedKeys(slots, allowedKeys)
  }, [networkView, effectiveNetworkView, tableColumnSlots, isAdminMode])
  const adminDisplayMode = useStationAdminDisplayMode(initialDisplayMode)
  const { sections: sidebarSections, setSectionExpanded } = useStationAdminSidebarSections(
    initialSidebarSections ?? DEFAULT_STATION_ADMIN_SIDEBAR_SECTIONS
  )
  const isMobileStationsLayout = viewportMeasured && viewportWidth < 640
  const showSidebarViewSection = viewportMeasured && viewportWidth >= 640
  const effectiveDisplayMode: StationAdminDisplayMode = isMobileStationsLayout ? 'cards' : adminDisplayMode
  const handleDisplayModeChange = useCallback((mode: StationAdminDisplayMode) => {
    if (isMobileStationsLayout && mode === 'table') return
    writeStationAdminDisplayMode(mode)
  }, [isMobileStationsLayout])
  const handleShowOpenedOnChange = useCallback((show: boolean) => {
    setShowOpenedOn(show)
    writeStationCardShowOpenedOn(show)
  }, [])
  const handleNetworkViewChange = useCallback(
    (view: NetworkViewFilter) => {
      setHasUserInteractedWithFilters(false)
      setFilterSelections({
        tocs: [],
        countries: [],
        counties: [],
        boroughs: [],
        provinces: [],
        dateOpened: [],
        fareZones: [],
      })
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
  const canResetTableSort =
    tableSort.column !== 'name' || tableSort.direction !== 'asc'
  const pendingChangesCount = useMemo(() => {
    if (networkView === 'all') {
      return ALL_VIEW_NETWORK_COLLECTION_IDS.reduce(
        (sum, id) => sum + countPendingChangesForCollection(pendingChanges, id),
        0
      )
    }
    return countPendingChangesForCollection(pendingChanges, collectionId)
  }, [pendingChanges, collectionId, networkView])
  const isAdminPanelVisible =
    surface === 'admin' ? initialMode === 'edit' || isAdminMode : isAdminMode
  // Catalog defaults only — avoid Firestore sample fetch on the list page critical path.

  useEffect(() => {
    finishStationsListFiltersRestore()
  }, [])

  useEffect(() => {
    if (!restoredListFilters?.networkView) return
    setNetworkView(restoredListFilters.networkView)
  }, [restoredListFilters, setNetworkView])

  useEffect(() => {
    if (initialMode === 'edit') {
      setIsEditMode(true)
      return
    }
    if (!isAdminMode) {
      setIsEditMode(false)
    }
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

  const {
    stations,
    uniqueValues,
    defaultSelections,
    effectiveSelections,
    sortedStations,
  } = useStationListPipeline({
    loadedStations,
    pendingChanges,
    networkView: effectiveNetworkView,
    debouncedSearchTerm,
    searchMode,
    filterSelections,
    hasUserInteractedWithFilters,
    sortOption,
    passengerSortYear,
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
  const isSupertramNetworkView = effectiveNetworkView === 'lightrail_GBSHEFFSUPERTRAM'
  const showLondonBoroughToggle = useMemo(() => {
    if (isSupertramNetworkView) return false
    if (
      effectiveNetworkView === 'stations_roiirerail' ||
      effectiveNetworkView === 'stations_nitranslink'
    ) {
      return false
    }
    if (effectiveNetworkView === 'stations_gbheritage') {
      return uniqueValues.counties.some((county) => isGreaterLondonCounty(county))
    }
    return true
  }, [effectiveNetworkView, isSupertramNetworkView, uniqueValues.counties])
  const isIrishOrNiNetworkView =
    effectiveNetworkView === 'stations_roiirerail' ||
    effectiveNetworkView === 'stations_nitranslink'
  const showCountryFilter = !isSupertramNetworkView && !isIrishOrNiNetworkView
  const showTocFilter = !isSupertramNetworkView && !isIrishOrNiNetworkView
  const showProvinceFilterInline =
    isIrishOrNiNetworkView && uniqueValues.provinces.length > 0
  const showIrishNiSection =
    effectiveNetworkView === 'all' && uniqueValues.provinces.length > 0
  const showProvinceFilters = showProvinceFilterInline || showIrishNiSection
  const showSupertramOnlyFilters =
    isSupertramNetworkView || effectiveNetworkView === 'all'
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
        return DATE_OPENED_SORT_NETWORK_VIEWS.has(effectiveNetworkView)
      }
      if (isPassengersSortOption(option.value)) {
        return !NETWORKS_WITHOUT_PASSENGERS_SORT.has(effectiveNetworkView)
      }
      if (isTocSortOption(option.value)) {
        return !NETWORKS_WITHOUT_TOC_SORT.has(effectiveNetworkView)
      }
      return true
    }).map((option) =>
      isSupertramNetworkView && isDateOpenedSortOption(option.value)
        ? { ...option, label: option.label.replace(/\*$/, '') }
        : option
    )
  }, [effectiveNetworkView, isSupertramNetworkView])
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

  const CARD_ITEMS_PER_PAGE = 24
  const CARD_ROWS_AT_THREE_COLUMNS = CARD_ITEMS_PER_PAGE / 3
  const CARD_EXTRA_ROWS_AT_THREE_COLUMNS = 5
  const TABLE_ITEMS_PER_PAGE = 100
  // Enough ghost rows to fill the viewport without rendering a full 100-row page.
  const TABLE_SKELETON_ROW_COUNT = 25
  // Fewer skeleton cards on narrow viewports — less style/layout work on mobile LCP.
  const cardSkeletonCount = !viewportMeasured
    ? 8
    : isMobileStationsLayout
      ? 6
      : viewportWidth < 1024
        ? 12
        : CARD_ITEMS_PER_PAGE
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
  }, [effectiveDisplayMode, updateCardColumnCount, visibleStations.length])

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
  const totalPages = Math.ceil(visibleStations.length / itemsPerPage)
  const paginatedStations = visibleStations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const tableStations = paginatedStations
  const passengerYears = useMemo(
    () => collectYearlyPassengerYears(visibleStations),
    [visibleStations]
  )
  const passengerSortYearOptions = useMemo((): PassengerSortYear[] => {
    const years = collectYearlyPassengerYears(stations)
    return years.length > 0 ? ['latest', ...years] : ['latest']
  }, [stations])
  const passengerSortYearLabels = useMemo(
    () =>
      passengerSortYearOptions.map((year) =>
        year === 'latest' ? PASSENGER_SORT_YEAR_LATEST_LABEL : year
      ),
    [passengerSortYearOptions]
  )
  const showPassengerYearSortDdm =
    effectiveDisplayMode === 'cards' &&
    isPassengersSortOption(sortOption) &&
    passengerSortYearOptions.length > 1
  const handleStationNavigate = useCallback(
    (station: (typeof visibleStations)[number]) => {
      const returnTo = `${pathname}${routerLocation.search}`
      writeStationsListFiltersState({
        searchTerm,
        searchMode,
        filterSelections,
        hasUserInteractedWithFilters,
        sortOption,
        passengerSortYear,
        tableSort,
        supertramLineFilter,
        currentPage,
        networkView: effectiveNetworkView,
      })
      markStationsListFiltersForRestore()
      setStationDetailsNavigationState({ returnTo: returnTo || '/admin/stations' })
      router.push(
        isEditMode
          ? `/admin/stations/${buildStationPath(station, collectionId)}/edit`
          : `/stations/${buildStationPath(station, collectionId)}`
      )
    },
    [
      router,
      collectionId,
      isEditMode,
      pathname,
      routerLocation.search,
      searchTerm,
      searchMode,
      filterSelections,
      hasUserInteractedWithFilters,
      sortOption,
      passengerSortYear,
      tableSort,
      supertramLineFilter,
      currentPage,
      effectiveNetworkView,
    ]
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
      provinces: [],
      dateOpened: [],
      fareZones: [],
    })
    setHasUserInteractedWithFilters(false)
    setSupertramLineFilter([])
  }, [])

  const renderProvinceFilter = () =>
    uniqueValues.provinces.length > 0 ? (
      <div className="filter-group">
        <label className="filter-label">Province</label>
        <BUTDDMListActionDual
          items={uniqueValues.provinces}
          filterName="Provinces"
          selectionMode="multi"
          selectedPositions={getSelectedPositions(uniqueValues.provinces, effectiveSelections.provinces)}
          onSelectionChanged={(_, selectedItems) => updateFilterSelection('provinces', selectedItems)}
          colorVariant="primary"
        />
      </div>
    ) : null
  const sortControls = (
    <div className="sort-section">
      <BUTDDMList
        items={availableSortOptions.map((option) => option.label)}
        filterName="Sort"
        selectionMode="single"
        selectedPositions={[Math.max(0, availableSortOptions.findIndex((option) => option.value === sortOption))]}
        onSelectionChanged={(selectedPositions) => {
          const selectedIndex = selectedPositions[0]
          if (typeof selectedIndex !== 'number') return
          const selectedSortOption = availableSortOptions[selectedIndex]
          if (selectedSortOption) {
            setSortOption(selectedSortOption.value)
            setTableSort(sortOptionToTableSort(selectedSortOption.value))
          }
        }}
        colorVariant="primary"
      />
      {showPassengerYearSortDdm && (
        <BUTDDMList
          items={passengerSortYearLabels}
          filterName="Year"
          selectionMode="single"
          selectedPositions={[
            Math.max(0, passengerSortYearOptions.findIndex((year) => year === passengerSortYear)),
          ]}
          onSelectionChanged={(selectedPositions) => {
            const selectedIndex = selectedPositions[0]
            if (typeof selectedIndex !== 'number') return
            const selectedYear = passengerSortYearOptions[selectedIndex]
            if (selectedYear) setPassengerSortYear(selectedYear)
          }}
          colorVariant="primary"
        />
      )}
      {availableSortOptions.some((option) => isDateOpenedSortOption(option.value)) &&
        !isSupertramNetworkView && (
          <p className="sort-section__footnote">* SuperTram stops only</p>
        )}
    </div>
  )

  const allDateOpenedSelected =
    uniqueValues.dateOpened.length > 0 &&
    uniqueValues.dateOpened.every((date) => effectiveSelections.dateOpened.includes(date))
  const allDateOpenedCount = uniqueValues.dateOpened.reduce(
    (sum, date) => sum + (dateOpenedCounts.get(date) ?? 0),
    0
  )

  const supertramFilterBody = (
    <>
      <div className="filter-group">
        <label className="filter-label">Line</label>
        <StationsLineFilterTabs
          value={supertramLineFilter}
          onChange={setSupertramLineFilter}
          isVisible={isSupertramNetworkView || supertramFiltersExpanded}
        />
      </div>

      {effectiveDisplayMode === 'cards' && (
        <div className="filter-group">
          <div className="county-london-toggle">
            <span className="filter-label county-london-toggle__label">Show Date Opened</span>
            <TOGToggleVisited
              checked={showOpenedOn}
              onChange={() => handleShowOpenedOnChange(!showOpenedOn)}
              ariaLabel="Show Date Opened on SuperTram cards"
              className="county-london-toggle__control"
            />
          </div>
        </div>
      )}

      {uniqueValues.dateOpened.length > 0 && (
        <div className="filter-group">
          <label className="filter-label" id="stations-date-opened-filter-label">
            Date Opened
          </label>
          <div
            className="stations-date-opened-checklist"
            role="group"
            aria-labelledby="stations-date-opened-filter-label"
          >
            <label className="stations-date-opened-checklist__item stations-date-opened-checklist__item--all">
              <span className="stations-date-opened-checklist__control">
                <input
                  type="checkbox"
                  checked={allDateOpenedSelected}
                  onChange={() => {
                    updateFilterSelection(
                      'dateOpened',
                      allDateOpenedSelected ? [] : [...uniqueValues.dateOpened]
                    )
                  }}
                />
                <span className="stations-date-opened-checklist__box" aria-hidden>
                  <Check
                    className="stations-date-opened-checklist__check"
                    size={12}
                    weight="bold"
                  />
                </span>
              </span>
              <span>All ({allDateOpenedCount})</span>
            </label>
            {uniqueValues.dateOpened.map((date) => {
              const checked = effectiveSelections.dateOpened.includes(date)
              const count = dateOpenedCounts.get(date) ?? 0
              return (
                <label key={date} className="stations-date-opened-checklist__item">
                  <span className="stations-date-opened-checklist__control">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = effectiveSelections.dateOpened
                        const next = checked
                          ? current.filter((value) => value !== date)
                          : [...current, date]
                        updateFilterSelection('dateOpened', next)
                      }}
                    />
                    <span className="stations-date-opened-checklist__box" aria-hidden>
                      <Check
                        className="stations-date-opened-checklist__check"
                        size={12}
                        weight="bold"
                      />
                    </span>
                  </span>
                  <span>
                    {date} ({count})
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </>
  )

  const filterControls = (
    <div className="filters-panel">
      {!isSupertramNetworkView && (
        <>
          {showTocFilter && (
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
          )}

          {showCountryFilter && (
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
          )}

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

          {showProvinceFilterInline ? renderProvinceFilter() : null}
        </>
      )}

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

      {showLondonBoroughToggle && (
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
      )}

      {isSupertramNetworkView && supertramFilterBody}

      {effectiveNetworkView === 'all' && (
        <section
          className={[
            'filters-panel__section',
            'filters-panel__section--supertram',
            supertramFiltersExpanded
              ? 'filters-panel__section--expanded'
              : 'filters-panel__section--collapsed',
          ].join(' ')}
        >
          <button
            type="button"
            className="filters-panel__section-toggle"
            aria-expanded={supertramFiltersExpanded}
            aria-controls={supertramFiltersPanelId}
            onClick={() => setSupertramFiltersExpanded((current) => !current)}
          >
            <span className="filters-panel__section-title" id="stations-supertram-filters-heading">
              South Yorkshire SuperTram
            </span>
            <ChevronRightIcon className="filters-panel__section-chevron" aria-hidden />
          </button>

          <CollapsibleSection
            isExpanded={supertramFiltersExpanded}
            className="filters-panel__section-panel-host"
            innerClassName="filters-panel__section-panel"
            ariaHidden={!supertramFiltersExpanded}
          >
            <div className="filters-panel__section-body" id={supertramFiltersPanelId}>
              {supertramFilterBody}
            </div>
          </CollapsibleSection>
        </section>
      )}

      {showIrishNiSection && (
        <section
          className={[
            'filters-panel__section',
            'filters-panel__section--irish-ni',
            irishNiFiltersExpanded
              ? 'filters-panel__section--expanded'
              : 'filters-panel__section--collapsed',
          ].join(' ')}
        >
          <button
            type="button"
            className="filters-panel__section-toggle"
            aria-expanded={irishNiFiltersExpanded}
            aria-controls={irishNiFiltersPanelId}
            onClick={() => setIrishNiFiltersExpanded((current) => !current)}
          >
            <span className="filters-panel__section-title" id="stations-irish-ni-filters-heading">
              Irish Rail & NI Translink
            </span>
            <ChevronRightIcon className="filters-panel__section-chevron" aria-hidden />
          </button>

          <CollapsibleSection
            isExpanded={irishNiFiltersExpanded}
            className="filters-panel__section-panel-host"
            innerClassName="filters-panel__section-panel"
            ariaHidden={!irishNiFiltersExpanded}
          >
            <div className="filters-panel__section-body" id={irishNiFiltersPanelId}>
              {renderProvinceFilter()}
            </div>
          </CollapsibleSection>
        </section>
      )}

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
    writeStationsListFiltersState({
      searchTerm,
      searchMode,
      filterSelections,
      hasUserInteractedWithFilters,
      sortOption,
      passengerSortYear,
      tableSort,
      supertramLineFilter,
      currentPage,
      networkView: effectiveNetworkView,
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
    effectiveNetworkView,
  ])

  useEffect(() => {
    if (skipInitialPageResetRef.current) {
      skipInitialPageResetRef.current = false
      return
    }
    setCurrentPage(1)
  }, [debouncedSearchTerm, effectiveSelections, sortOption, passengerSortYear, collectionId, networkView, tableSort, effectiveDisplayMode, cardItemsPerPage, supertramLineFilter])

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

    const timer = window.setTimeout(() => setMinSkeletonElapsed(true), MIN_SKELETON_MS)
    return () => window.clearTimeout(timer)
  }, [])

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
    !error && (loading || !minSkeletonElapsed || networkTabSkeletonActive)
  const showMainError = Boolean(error)
  const showMainContent = !showMainSkeleton && !showMainError

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
        title="Stations & Light Rail Database"
        subtitle={
          isEditMode
            ? 'View or edit station fields and prepare changes for publishing'
            : 'Explore all Railway Stations, Metro and Tram Stops.'
        }
      />
      <div className="stations-toolbar-band">
        <div className="stations-network-tabs-wrap stations-network-tabs-wrap--toolbar">
          <NetworkStationTabGroup
            value={effectiveNetworkView}
            onChange={handleNetworkViewChange}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="stations-content">
        {/* Sidebar */}
        <aside
          className={['stations-sidebar', showMainSkeleton ? 'stations-sidebar--loading' : '']
            .filter(Boolean)
            .join(' ')}
          aria-busy={showMainSkeleton}
          aria-disabled={showMainSkeleton}
        >
          <SidebarPanel className="stations-sidebar-panel">
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
                onResetTableSort={handleResetTableSort}
                canResetTableSort={canResetTableSort}
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
          </SidebarPanel>
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
                passengerYears={passengerYears}
                isLoading
                skeletonRowCount={TABLE_SKELETON_ROW_COUNT}
              />
            ) : (
              <StationsCardGridSkeleton count={cardSkeletonCount} />
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
              passengerYears={passengerYears}
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
                  <LightRailStopCard
                    key={getStationMapKey(station)}
                    {...cardProps}
                    showOpenedOn={showOpenedOn}
                    showOrderOfOpening={isAdminMode}
                  />
                ) : (
                  <StationCard
                    key={getStationMapKey(station)}
                    {...cardProps}
                    reserveLineStripSpace={effectiveNetworkView === 'all'}
                  />
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
          slots={effectiveTableColumnSlots}
          networkView={networkView}
          fieldSchema={tableHeaderFieldSchemaForModal}
          isAdminMode={isAdminMode}
          onApply={setTableColumnSlots}
          onClose={() => setIsTableColumnsModalOpen(false)}
        />
      ) : null}
    </div>
  )
}

export default StationsPageClient