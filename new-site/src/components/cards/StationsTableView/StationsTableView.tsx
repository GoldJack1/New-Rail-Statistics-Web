'use client'

import React, { useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Station } from '../../../types'
import { LightRailLineChips } from '../../chips/LightRailLineChips'
import { isLightRailStop } from '../../../utils/stationCardForNetwork'
import {
  formatTableCellValue,
  getTableColumnValue,
  resolveTableColumnsFromSlots,
  toggleTableSort,
  type StationsTableColumnDefinition,
  type StationsTableColumnSlot,
  type StationsTableSort,
} from '../../../utils/stationsTableColumns'
import { getLatestYearlyPassengerDisplay } from '../../../utils/yearlyPassengers'
import { getStationMapKey } from '../../../utils/stationAreaSlug'
import './StationsTableView.css'

const TABLE_ROW_HEIGHT_PX = 44
/** Above admin table page size (100) so rows scroll with the page, not a nested container. */
const VIRTUALIZE_THRESHOLD = 101

interface StationsTableViewProps {
  stations: Station[]
  sort: StationsTableSort
  onSortChange: (sort: StationsTableSort) => void
  onRowClick: (station: Station) => void
  columnSlots: StationsTableColumnSlot[]
}

function renderTableCell(station: Station, column: StationsTableColumnDefinition): React.ReactNode {
  if (column.key === 'latestPassengers') {
    const display = getLatestYearlyPassengerDisplay(station.yearlyPassengers)
    return display || '—'
  }

  if (column.renderAsLinesChips) {
    if (!isLightRailStop(station)) {
      return '—'
    }

    return (
      <LightRailLineChips
        linesServed={station.linesServed}
        emptyLabel="—"
        className="stations-table__lines-chips"
      />
    )
  }

  return formatTableCellValue(getTableColumnValue(station, column.key))
}

function StationTableRow({
  station,
  visibleColumns,
  onRowClick,
  rowIndex,
}: {
  station: Station
  visibleColumns: StationsTableColumnDefinition[]
  onRowClick: (station: Station) => void
  rowIndex: number
}) {
  const rowKey = getStationMapKey(station)

  return (
    <tr
      key={rowKey}
      className={[
        'stations-table__row',
        rowIndex % 2 === 1 ? 'stations-table__row--striped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      tabIndex={0}
      onClick={() => onRowClick(station)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onRowClick(station)
        }
      }}
    >
      {visibleColumns.map((column) => (
        <td
          key={`cell-${rowKey}-${column.slotIndex}`}
          className={[
            column.cellClassName,
            column.renderAsLinesChips ? 'stations-table__lines-cell' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {renderTableCell(station, column)}
        </td>
      ))}
    </tr>
  )
}

const StationsTableView: React.FC<StationsTableViewProps> = ({
  stations,
  sort,
  onSortChange,
  onRowClick,
  columnSlots,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibleColumns = useMemo(
    () => resolveTableColumnsFromSlots(columnSlots),
    [columnSlots]
  )
  const visibleColumnKeys = useMemo(
    () => visibleColumns.map((column) => column.key),
    [visibleColumns]
  )
  const shouldVirtualize = stations.length >= VIRTUALIZE_THRESHOLD

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? stations.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TABLE_ROW_HEIGHT_PX,
    overscan: 10,
  })

  useEffect(() => {
    if (!visibleColumnKeys.includes(sort.column)) {
      onSortChange({ column: 'name', direction: 'asc' })
    }
  }, [onSortChange, sort.column, visibleColumnKeys])

  const handleHeaderClick = (column: StationsTableColumnDefinition) => {
    onSortChange(toggleTableSort(sort, column.key))
  }

  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0

  return (
    <div className="stations-table-panel">
      <div
        ref={scrollRef}
        className={[
          'stations-table-wrap',
          shouldVirtualize ? 'stations-table-wrap--virtualized' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <table className="stations-table">
          <thead>
            <tr>
              {visibleColumns.map((column) => {
                const isSorted = sort.column === column.key
                const ariaSort = isSorted
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'

                return (
                  <th key={`header-${column.slotIndex}`} scope="col" aria-sort={ariaSort}>
                    <button
                      type="button"
                      className={[
                        'stations-table__sort-button',
                        isSorted ? 'stations-table__sort-button--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleHeaderClick(column)}
                    >
                      <span>{column.label}</span>
                      {isSorted && (
                        <span className="stations-table__sort-indicator" aria-hidden="true">
                          {sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {shouldVirtualize ? (
              <>
                {paddingTop > 0 && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={visibleColumns.length}
                      className="stations-table__virtual-spacer"
                      style={{ height: paddingTop }}
                    />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => {
                  const station = stations[virtualRow.index]
                  if (!station) return null
                  return (
                    <StationTableRow
                      key={getStationMapKey(station)}
                      station={station}
                      visibleColumns={visibleColumns}
                      onRowClick={onRowClick}
                      rowIndex={virtualRow.index}
                    />
                  )
                })}
                {paddingBottom > 0 && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={visibleColumns.length}
                      className="stations-table__virtual-spacer"
                      style={{ height: paddingBottom }}
                    />
                  </tr>
                )}
              </>
            ) : (
              stations.map((station, rowIndex) => (
                <StationTableRow
                  key={getStationMapKey(station)}
                  station={station}
                  visibleColumns={visibleColumns}
                  onRowClick={onRowClick}
                  rowIndex={rowIndex}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default StationsTableView
