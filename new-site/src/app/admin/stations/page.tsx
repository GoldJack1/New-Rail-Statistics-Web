'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageTopHeader } from '@/components/misc'
import StationCard from '@/components/cards/StationCard/StationCard'
import LightRailStopCard from '@/components/cards/LightRailStopCard/LightRailStopCard'
import StationsTableView from '@/components/cards/StationsTableView/StationsTableView'
import StationAdminControls from '@/components/cards/StationAdminControls/StationAdminControls'
import NetworkStationTabGroup from '@/components/cards/NetworkStationTabGroup/NetworkStationTabGroup'
import TXTINPBUTIconWideButtonSearch from '@/components/textInputButtons/special/TXTINPBUTIconWideButtonSearch'
import { isLightRailStop } from '@/utils/stationCardForNetwork'
import { formatStationLocationDisplay } from '@/utils/formatStationLocation'
import { sortStationsByTableColumn, type StationsTableSort } from '@/utils/stationsTableColumns'
import { getDefaultTableColumnSlots } from '@/utils/stationsTableColumnCatalog'
import type { StationAdminDisplayMode } from '@/utils/stationAdminDisplayModeStorage'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import type { Station } from '@/types'
import './StationsPageRefactored.css'

/**
 * Phase 1 placeholder (MIGRATION_PLAN.md §5.7): correct layout/header/toolbar using
 * a small hardcoded/mock dataset shaped like real station data — no Firestore
 * connection, no edit/save actions wired (`StationAdminControls` mode/sandbox
 * toggles are cosmetic only in Phase 1).
 */
export default function AdminStationsPage() {
  const [allStations, setAllStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [networkView, setNetworkView] = useState<NetworkViewFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSandbox, setIsSandbox] = useState(false)
  const [displayMode, setDisplayMode] = useState<StationAdminDisplayMode>('cards')
  const [tableSort, setTableSort] = useState<StationsTableSort>({ column: 'name', direction: 'asc' })

  useEffect(() => {
    let cancelled = false
    void fetch('/data/stations-map-sample.json')
      .then((res) => res.json())
      .then((data: Station[]) => {
        if (!cancelled) setAllStations(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const networkFiltered = useMemo(
    () =>
      networkView === 'all'
        ? allStations
        : allStations.filter((station) => station.sourceCollectionId === networkView),
    [allStations, networkView]
  )

  const searchedStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return networkFiltered
    return networkFiltered.filter(
      (station) =>
        station.stationName.toLowerCase().includes(term) ||
        station.crsCode.toLowerCase().includes(term) ||
        (station.tiploc ?? '').toLowerCase().includes(term)
    )
  }, [networkFiltered, searchTerm])

  const sortedStations = useMemo(
    () =>
      displayMode === 'table'
        ? sortStationsByTableColumn(searchedStations, tableSort)
        : [...searchedStations].sort((a, b) => a.stationName.localeCompare(b.stationName)),
    [searchedStations, displayMode, tableSort]
  )

  const tableColumnSlots = useMemo(() => getDefaultTableColumnSlots(networkView), [networkView])

  if (loading) {
    return (
      <div className="stations-page">
        <div className="stations-loading">
          <div className="loading-spinner" />
          <p>Loading sample station data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stations-page">
      <PageTopHeader
        title="Station Database"
        subtitle="Phase 1 preview — sample data only, no live database connection yet."
      />
      <div className="stations-toolbar-band">
        <div className="stations-admin-controls-wrap">
          <StationAdminControls
            isEditMode={isEditMode}
            isSandbox={isSandbox}
            displayMode={displayMode}
            pendingChangesCount={0}
            onModeChange={(mode) => setIsEditMode(mode === 'edit')}
            onDisplayModeChange={setDisplayMode}
            onSandboxChange={setIsSandbox}
            onOpenPendingChanges={() => console.log('[Phase 1 placeholder] Open pending changes — not wired yet.')}
            onAddStation={() => console.log('[Phase 1 placeholder] Add station — not wired yet.')}
          />
        </div>
        <div className="stations-network-tabs-wrap stations-network-tabs-wrap--toolbar">
          <NetworkStationTabGroup value={networkView} onChange={setNetworkView} />
        </div>
      </div>

      <div className="stations-content">
        <aside className="stations-sidebar">
          <div className="sidebar-section">
            <h2 className="sidebar-section-title sidebar-section-title--subsection">Search</h2>
            <div className="search-container">
              <TXTINPBUTIconWideButtonSearch
                id="admin-stations-search"
                name="station-search"
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="7" cy="7" r="4" />
                    <line x1="11" y1="11" x2="13" y2="13" />
                  </svg>
                }
                value={searchTerm}
                onChange={setSearchTerm}
                onClear={() => setSearchTerm('')}
                className="search-input-shell"
                placeholder="Search stations..."
                autoComplete="off"
                colorVariant="primary"
                showClear
              />
            </div>
          </div>
        </aside>

        <main className="stations-main">
          {sortedStations.length === 0 ? (
            <p className="stations-page-grid" role="status">
              No sample stations match your search.
            </p>
          ) : displayMode === 'table' ? (
            <StationsTableView
              stations={sortedStations}
              sort={tableSort}
              onSortChange={setTableSort}
              onRowClick={(station) => console.log('[Phase 1 placeholder] Open station:', station.stationName)}
              columnSlots={tableColumnSlots}
            />
          ) : (
            <div className="stations-page-grid">
              {sortedStations.map((station) => {
                const cardProps = {
                  station,
                  locationDisplay: formatStationLocationDisplay(station),
                  onCardClick: () => console.log('[Phase 1 placeholder] Open station:', station.stationName),
                  onInfoClick: () => console.log('[Phase 1 placeholder] Open station:', station.stationName),
                }
                return isLightRailStop(station) ? (
                  <LightRailStopCard key={station.id} {...cardProps} />
                ) : (
                  <StationCard key={station.id} {...cardProps} />
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}