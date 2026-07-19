'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { BUTTabButton } from '../../buttons'
import { StationDetailsSubsection } from './StationDetailsSubsection'
import { StationSectionTitle } from './StationSectionTitle'
import { getStationDetailsSectionIcon } from '../../../utils/stationDetailFieldIcons'
import type { GbnrOdmDestination, GbnrOdmFlowsDoc } from '../../../services/gbnrOdmFlows'
import type { GbnrOdmFlowsState } from '../../../hooks/useGbnrOdmFlows'
import '../../cards/NetworkStationTabGroup/NetworkStationTabGroup.css'
import '../../cards/StationsTableView/StationsTableView.css'
import './StationUsageDataNotice.css'
import './StationOdmFlowsSection.css'

const ODM_SOURCE_HINT =
  'View the top and bottom 25 stations by estimated journeys from this origin, using ORR Origin–Destination Matrix data.'

function KnowledgebaseSourceHint({ label }: { label?: string | null }) {
  const text = label?.trim()
  if (!text) return null
  return <p className="edit-hint kb-source-hint">{text}</p>
}

function formatJourneys(value: number): string {
  return value.toLocaleString()
}

function OdmDestinationTable({
  rows,
  emptyLabel,
}: {
  rows: GbnrOdmDestination[]
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return <p className="edit-hint">{emptyLabel}</p>
  }

  return (
    <div className="stations-table-panel station-odm-flows-table-panel">
      <div className="stations-table-wrap">
        <table className="stations-table station-odm-flows-table">
          <colgroup>
            <col className="station-odm-flows-table__col-rank" />
            <col className="station-odm-flows-table__col-dest" />
            <col className="station-odm-flows-table__col-journeys" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="station-odm-flows-table__rank-col">
                <span className="station-odm-flows-table__header">Rank</span>
              </th>
              <th scope="col">
                <span className="station-odm-flows-table__header">Destination</span>
              </th>
              <th scope="col" className="station-odm-flows-table__journeys-col">
                <span className="station-odm-flows-table__header">Journeys</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.rank}-${row.nlc}`}
                className={[
                  'stations-table__row',
                  'station-odm-flows-table__row',
                  index % 2 === 1 ? 'stations-table__row--striped' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <td className="stations-table__id station-odm-flows-table__rank-col">{row.rank}</td>
                <td className="stations-table__name">
                  <span className="station-odm-flows-table__dest">
                    {row.crsCode ? (
                      <span className="station-odm-flows-table__crs">({row.crsCode})</span>
                    ) : null}
                    <span>{row.stationName || '—'}</span>
                  </span>
                </td>
                <td className="station-odm-flows-table__journeys-col">
                  {formatJourneys(row.journeys)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type StationOdmFlowsSectionProps = {
  state: GbnrOdmFlowsState
}

export function StationOdmFlowsSection({ state }: StationOdmFlowsSectionProps) {
  const doc: GbnrOdmFlowsDoc | null = state.status === 'ready' ? state.doc : null
  const years = useMemo(
    () => (doc ? Object.keys(doc.years).sort((a, b) => parseInt(b, 10) - parseInt(a, 10)) : []),
    [doc]
  )
  const [selectedYear, setSelectedYear] = useState<string>('')

  useEffect(() => {
    if (years.length === 0) {
      setSelectedYear('')
      return
    }
    setSelectedYear((prev) => (prev && years.includes(prev) ? prev : years[0]))
  }, [years])

  const yearBucket = doc && selectedYear ? doc.years[selectedYear] : null

  return (
    <div className="modal-section">
      <StationSectionTitle
        title="Popular destinations from this station"
        icon={getStationDetailsSectionIcon('usage')}
        pageHeading
      />
      <KnowledgebaseSourceHint label={ODM_SOURCE_HINT} />

      {state.status === 'waiting_nlc' && (
        <p className="edit-hint">Waiting for NLC to match ODM destination flows…</p>
      )}
      {state.status === 'loading' && (
        <p className="edit-hint">Loading ODM destination flows…</p>
      )}
      {state.status === 'error' && <p className="edit-hint">{state.message}</p>}
      {state.status === 'not_found' && (
        <p className="edit-hint">No GBNR-ODM-FLOWS document for NLC {state.nlc}.</p>
      )}

      {state.status === 'ready' && doc && (
        <>
          {years.length > 0 ? (
            <div
              className="network-station-tab-group station-usage-metric-tabs"
              role="tablist"
              aria-label="ODM financial year"
            >
              {years.map((year) => (
                <BUTTabButton
                  key={year}
                  type="button"
                  width="hug"
                  role="tab"
                  pressed={selectedYear === year}
                  ariaSelected={selectedYear === year}
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </BUTTabButton>
              ))}
            </div>
          ) : (
            <p className="edit-hint">No yearly ODM data for this station.</p>
          )}

          {yearBucket && (
            <>
              <p className="station-odm-flows-meta">
                {yearBucket.financialYearLabel || `Year ending ${selectedYear}`}
                {yearBucket.destinationCount != null
                  ? ` · ${yearBucket.destinationCount.toLocaleString()} destinations in full matrix`
                  : null}
                {doc.nlc ? ` · origin NLC ${doc.nlc}` : null}
              </p>

              <StationDetailsSubsection title="Top 25 destinations">
                <OdmDestinationTable
                  rows={yearBucket.topDestinations}
                  emptyLabel="No top destinations for this year."
                />
              </StationDetailsSubsection>

              <StationDetailsSubsection title="Bottom 25 destinations">
                <OdmDestinationTable
                  rows={yearBucket.bottomDestinations}
                  emptyLabel="No bottom destinations for this year."
                />
              </StationDetailsSubsection>

              <p className="station-usage-data-notice">
                * ODM journey counts are estimates from ticket origin–destination pairs and will not
                match entries and exits totals above.
                <br />
                ** Year labels use the ending year of each April–March period (for example, 2025 =
                April 2024 to March 2025).
                <br />
                *** Bottom ranks often include many destinations tied at 1 journey.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default StationOdmFlowsSection
