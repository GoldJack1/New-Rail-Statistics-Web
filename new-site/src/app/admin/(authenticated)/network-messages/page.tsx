'use client'

import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'

import { BUTWideButton } from '@/components/buttons'
import { PageTopHeader } from '@/components/misc'
import BUTDDMList from '@/components/buttons/ddm/BUTDDMList'
import TXTINPBUTIconWideButtonSearch from '@/components/textInputButtons/special/TXTINPBUTIconWideButtonSearch'
import { SelectionDot, TextCard, type TextCardState } from '@/components/cards'
import {
  NETWORK_LABELS,
  NETWORK_VIEW_TABS,
  type NetworkViewFilter
} from '@/constants/stationCollections'
import type { NetworkMessage } from '@/types/networkMessages'
import {
  deleteNetworkMessage,
  listNetworkMessagesForAdmin,
  setNetworkMessageActive
} from '@/services/networkMessages'
import './NetworkMessagesAdminPage.css'

type ActiveFilter = 'all' | 'active' | 'inactive'

const ACTIVE_OPTIONS: Array<{ label: string; value: ActiveFilter }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const NETWORK_FILTER_OPTIONS = NETWORK_VIEW_TABS

function networkLabel(network: NetworkMessage['network']): string {
  return NETWORK_LABELS[network] ?? network
}

const NetworkMessagesDashboardPage: React.FC = () => {
  const router = useRouter()
  const [rows, setRows] = useState<NetworkMessage[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [pressedSelectorId, setPressedSelectorId] = useState<string | null>(null)
  const [selectedActive, setSelectedActive] = useState<ActiveFilter>('all')
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkViewFilter>('all')
  const [search, setSearch] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const selectorPressTimeoutRef = useRef<number | null>(null)

  const loadRows = useCallback(async () => {
    const loadedRows = await listNetworkMessagesForAdmin({
      active: selectedActive,
      network: selectedNetwork,
      search
    })
    setRows(loadedRows)
  }, [search, selectedActive, selectedNetwork])

  useEffect(() => {
    void loadRows().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load network messages.')
    })
  }, [loadRows])

  useEffect(() => {
    return () => {
      if (selectorPressTimeoutRef.current !== null) {
        window.clearTimeout(selectorPressTimeoutRef.current)
      }
    }
  }, [])

  const stats = useMemo(() => {
    const out = { total: rows.length, active: 0, inactive: 0 }
    for (const row of rows) {
      if (row.active) out.active += 1
      else out.inactive += 1
    }
    return out
  }, [rows])

  const selectedActiveIndex = Math.max(
    0,
    ACTIVE_OPTIONS.findIndex((option) => option.value === selectedActive)
  )
  const selectedNetworkIndex = Math.max(
    0,
    NETWORK_FILTER_OPTIONS.findIndex((option) => option.value === selectedNetwork)
  )
  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedMessageId) ?? null,
    [rows, selectedMessageId]
  )

  const getCardState = (rowId: string): TextCardState =>
    selectedMessageId === rowId ? 'accent' : 'default'

  const toggleRowSelection = (rowId: string) => {
    setSelectedMessageId((prev) => (prev === rowId ? null : rowId))
  }

  const handleSelectorDotClick = (rowId: string) => {
    setPressedSelectorId(rowId)
    toggleRowSelection(rowId)
    if (selectorPressTimeoutRef.current !== null) {
      window.clearTimeout(selectorPressTimeoutRef.current)
    }
    selectorPressTimeoutRef.current = window.setTimeout(() => {
      setPressedSelectorId((prev) => (prev === rowId ? null : prev))
      selectorPressTimeoutRef.current = null
    }, 250)
  }

  const activateRowQuick = async (row: NetworkMessage) => {
    setIsBusy(true)
    setError(null)
    setNotice(null)
    try {
      await setNetworkMessageActive(row.id, true)
      await loadRows()
      setNotice(`Activated "${row.title || 'message'}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activate failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const deactivateRowQuick = async (row: NetworkMessage) => {
    setIsBusy(true)
    setError(null)
    setNotice(null)
    try {
      await setNetworkMessageActive(row.id, false)
      await loadRows()
      setNotice(`Deactivated "${row.title || 'message'}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deactivate failed.')
    } finally {
      setIsBusy(false)
    }
  }

  const deleteRowQuick = async (row: NetworkMessage) => {
    const confirmed = window.confirm(`Delete "${row.title || 'this network message'}" permanently?`)
    if (!confirmed) return
    setIsBusy(true)
    setError(null)
    setNotice(null)
    try {
      await deleteNetworkMessage(row.id)
      await loadRows()
      setNotice(`Deleted "${row.title || 'message'}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="message-centre-admin-page-shell">
      <PageTopHeader
        title="Network Messages"
        subtitle="Station & stop alerts by network — activate, deactivate, delete, or open to edit."
        actionContent={
          <>
            <BUTWideButton
              width="hug"
              colorVariant="green-action"
              instantAction
              disabled={isBusy || !selectedRow || selectedRow.active}
              onClick={() => (selectedRow ? void activateRowQuick(selectedRow) : undefined)}
            >
              Activate
            </BUTWideButton>
            <BUTWideButton
              width="hug"
              colorVariant="red-action"
              instantAction
              disabled={isBusy || !selectedRow || !selectedRow.active}
              onClick={() => (selectedRow ? void deactivateRowQuick(selectedRow) : undefined)}
            >
              Deactivate
            </BUTWideButton>
            <BUTWideButton
              width="hug"
              colorVariant="red-action"
              instantAction
              disabled={isBusy || !selectedRow}
              onClick={() => (selectedRow ? void deleteRowQuick(selectedRow) : undefined)}
            >
              Delete
            </BUTWideButton>
          </>
        }
      />
      <div className="message-centre-admin-page message-centre-admin-page--dashboard">
        <div className="message-centre-dashboard-content">
          <aside className="message-centre-dashboard-sidebar">
            <section className="message-centre-list-panel">
              <div className="message-centre-list-controls message-centre-list-controls--actions">
                <BUTWideButton
                  width="fill"
                  instantAction
                  onClick={() => router.push('/admin/network-messages/new')}
                >
                  New network message
                </BUTWideButton>
              </div>

              <div className="message-centre-panel-spacer" aria-hidden="true" />

              <h2 className="message-centre-section-title message-centre-section-title--subsection">
                Overview
              </h2>
              <section className="message-centre-dashboard-stats" aria-label="Network message stats">
                <div className="message-centre-stat-card">
                  <span>Total</span>
                  <strong>{stats.total}</strong>
                </div>
                <div className="message-centre-stat-card">
                  <span>Active</span>
                  <strong>{stats.active}</strong>
                </div>
                <div className="message-centre-stat-card">
                  <span>Inactive</span>
                  <strong>{stats.inactive}</strong>
                </div>
              </section>

              <div className="message-centre-panel-spacer" aria-hidden="true" />

              <h2 className="message-centre-section-title message-centre-section-title--subsection">
                Search
              </h2>
              <div className="message-centre-list-controls">
                <TXTINPBUTIconWideButtonSearch
                  id="network-messages-search"
                  icon={<MagnifyingGlass size={16} aria-hidden />}
                  value={search}
                  onChange={setSearch}
                  placeholder="Search title, preview, body..."
                  className="message-centre-search-input-shell"
                  colorVariant="primary"
                />
              </div>

              <div className="message-centre-panel-spacer" aria-hidden="true" />

              <h2 className="message-centre-section-title message-centre-section-title--subsection">
                Filters
              </h2>
              <div className="message-centre-list-controls">
                <BUTDDMList
                  items={ACTIVE_OPTIONS.map((option) => option.label)}
                  filterName="Status"
                  selectionMode="single"
                  selectedPositions={[selectedActiveIndex]}
                  onSelectionChanged={(selectedPositions) => {
                    const selectedIndex = selectedPositions[0]
                    if (typeof selectedIndex !== 'number') return
                    const selectedOption = ACTIVE_OPTIONS[selectedIndex]
                    if (!selectedOption) return
                    setSelectedActive(selectedOption.value)
                  }}
                  colorVariant="primary"
                />
                <BUTDDMList
                  items={NETWORK_FILTER_OPTIONS.map((option) => option.label)}
                  filterName="Network"
                  selectionMode="single"
                  selectedPositions={[selectedNetworkIndex]}
                  onSelectionChanged={(selectedPositions) => {
                    const selectedIndex = selectedPositions[0]
                    if (typeof selectedIndex !== 'number') return
                    const selectedOption = NETWORK_FILTER_OPTIONS[selectedIndex]
                    if (!selectedOption) return
                    setSelectedNetwork(selectedOption.value)
                  }}
                  colorVariant="primary"
                />
              </div>
            </section>
          </aside>

          <main className="message-centre-dashboard-main">
            <section className="message-centre-list-panel">
              <div className={`message-centre-status ${error || notice ? 'message-centre-status--active' : ''}`}>
                {error && <p className="message-centre-status__error">{error}</p>}
                {notice && <p className="message-centre-status__notice">{notice}</p>}
              </div>
              <div className="message-centre-list-items message-centre-list-items--cards">
                {rows.map((row) => (
                  <div className="message-row message-row--card" key={row.id}>
                    <div className="message-row-card-stack">
                      <div className="message-row-card-stack__select">
                        <button
                          type="button"
                          className={`message-row-select-dot ${
                            pressedSelectorId === row.id ? 'message-row-select-dot--pressed' : ''
                          }`}
                          aria-label={
                            selectedMessageId === row.id ? 'Message selected' : 'Select message'
                          }
                          onClick={() => handleSelectorDotClick(row.id)}
                        >
                          <SelectionDot selected={selectedMessageId === row.id} />
                        </button>
                      </div>
                      <div className="message-row-card-stack__main">
                        <TextCard
                          state={getCardState(row.id)}
                          title={row.title || 'Untitled network message'}
                          description={`${networkLabel(row.network)} · P${row.priority} · ${
                            row.active ? 'Active' : 'Inactive'
                          }${row.preview ? ` — ${row.preview.slice(0, 100)}` : ''}`}
                          onClick={() => router.push(`/admin/network-messages/${row.id}`)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default NetworkMessagesDashboardPage
