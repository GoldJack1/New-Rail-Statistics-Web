'use client'

import { useRouter, useParams } from 'next/navigation'
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useStationDetailsRoute } from '@/hooks/useStationDetailsRoute'
import { useStationCollectionFieldSchema } from '@/hooks/useStationCollectionFieldSchema'
import type { SandboxStationDoc } from '@/types'
import {
  buildStationPath,
  getStationNetworkCollectionId,
} from '@/utils/stationAreaSlug'
import { isStationCollectionId } from '@/constants/stationCollections'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { useAuth } from '@/contexts/AuthContext'
import { usePendingStationChanges } from '@/hooks/usePendingStationChanges'
import {
  getPendingFieldChangesForEntry,
  mergeAdditionalDocWithPendingUpdate,
  mergeStationWithPendingUpdate,
} from '@/utils/applyPendingChangesForDisplay'
import {
  EMPTY_STATION_COLLECTION_FIELD_SCHEMA,
  getVisibleStationDetailsTabs,
  inferStationCollectionFieldSchema,
  mergeStationCollectionFieldSchemas,
  stationDetailsShowsAdditionalTab,
  type StationDetailsTab,
} from '@/utils/stationCollectionFieldSchema'
import StationDetailsView from '@/components/models/StationDetails/StationDetailsView'
import { BUTWideButton } from '@/components/buttons'
import { BUTCircleButton } from '@/components/buttons'
import { BackIcon, ChevronRightIcon } from '@/components/icons'
import PageTopHeader from '@/components/misc/PageTopHeader/PageTopHeader'
import '@/components/misc/SidebarDropdownSection/SidebarDropdownSection.css'
import '@/components/models/StationModal/StationModal.css'
import { PencilSimple } from '@phosphor-icons/react'
import { paramAsString } from '@/utils/nextParams'
import { setStationDetailsNavigationState, readStationDetailsNavigationState } from '@/utils/clientNavigationState'
import './StationDetailsPage.css'

function getStationDetailsReturnPath(state: unknown): string {
  if (state && typeof state === 'object' && 'returnTo' in state) {
    const returnTo = (state as { returnTo?: unknown }).returnTo
    if (typeof returnTo === 'string' && returnTo.startsWith('/')) return returnTo
  }
  return '/stations'
}

function StationDetailsPage() {
  const router = useRouter()
  const backPath = getStationDetailsReturnPath(readStationDetailsNavigationState())
  const navigationState = readStationDetailsNavigationState()
  const params = useParams()
  const network = paramAsString(params.network)
  const stationSlug = paramAsString(params.stationSlug)
  const { collectionId } = useStationCollection()
  const { user, loading: authLoading } = useAuth()
  const canEdit = !authLoading && Boolean(user)
  const { station, loading, error, routeCollectionId } = useStationDetailsRoute(network, stationSlug)
  const [additionalDoc, setAdditionalDoc] = useState<SandboxStationDoc | null>(null)
  const [additionalLoading, setAdditionalLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<StationDetailsTab>('details')
  const [maxTabContentHeight, setMaxTabContentHeight] = useState(0)
  const visibleBodyRef = useRef<HTMLDivElement | null>(null)
  const tabMeasureRefs = useRef<Partial<Record<StationDetailsTab, HTMLDivElement | null>>>({})

  const { pendingChanges } = usePendingStationChanges()
  const pendingEntry = station ? pendingChanges[station.id] : undefined
  const pendingFieldChanges = useMemo(
    () => getPendingFieldChangesForEntry(pendingEntry, { additionalDocFallback: additionalDoc }),
    [pendingEntry, additionalDoc]
  )
  const displayStation = useMemo(
    () => (station ? mergeStationWithPendingUpdate(station, pendingEntry) : null),
    [station, pendingEntry]
  )
  const displayAdditionalDoc = useMemo(
    () => mergeAdditionalDocWithPendingUpdate(additionalDoc, pendingEntry),
    [additionalDoc, pendingEntry]
  )
  const showPendingOverlay = canEdit && Boolean(pendingEntry) && pendingFieldChanges.length > 0

  const schemaCollectionId = useMemo(() => {
    if (station) {
      const resolved = getStationNetworkCollectionId(station, routeCollectionId ?? collectionId)
      return resolved && isStationCollectionId(resolved) ? resolved : null
    }
    return routeCollectionId && isStationCollectionId(routeCollectionId) ? routeCollectionId : null
  }, [station, routeCollectionId, collectionId])
  const catalogFieldSchema = useMemo(
    () =>
      schemaCollectionId
        ? inferStationCollectionFieldSchema([], schemaCollectionId)
        : EMPTY_STATION_COLLECTION_FIELD_SCHEMA,
    [schemaCollectionId]
  )
  // Collection sample restores which tabs exist for the network; the station's own doc
  // restores sections that catalog defaults hide (Usage, Facilities, Service, etc.).
  const { fieldSchema: sampledFieldSchema, loading: schemaLoading } =
    useStationCollectionFieldSchema(schemaCollectionId)
  const fieldSchema = useMemo(() => {
    const base = schemaLoading ? catalogFieldSchema : sampledFieldSchema
    if (!additionalDoc || !schemaCollectionId) return base
    const fromStationDoc = inferStationCollectionFieldSchema(
      [additionalDoc as Record<string, unknown>],
      schemaCollectionId
    )
    return mergeStationCollectionFieldSchemas(base, fromStationDoc)
  }, [schemaLoading, catalogFieldSchema, sampledFieldSchema, additionalDoc, schemaCollectionId])
  const showAdditionalTab = stationDetailsShowsAdditionalTab(fieldSchema)
  const visibleTabs = useMemo(() => getVisibleStationDetailsTabs(fieldSchema), [fieldSchema])
  // Measuring the location tab mounts Leaflet/ORM tiles — skip it for height measurement.
  const measureTabs = useMemo(
    () => visibleTabs.filter((tab) => tab !== 'location'),
    [visibleTabs]
  )

  const sectionTabs = useMemo(() => {
    const tabs: Array<{ id: StationDetailsTab; label: string }> = [{ id: 'details', label: 'Details' }]
    if (showAdditionalTab) tabs.push({ id: 'additional', label: 'Additional details' })
    if (fieldSchema.showServiceTab) tabs.push({ id: 'service', label: 'Service & Connections' })
    tabs.push({ id: 'location', label: 'Location' })
    if (fieldSchema.showUsageTab) tabs.push({ id: 'usage', label: 'Usage' })
    if (fieldSchema.showStepFreeTab) tabs.push({ id: 'stepFree', label: fieldSchema.stepFreeTabLabel })
    if (fieldSchema.showFacilitiesTab) tabs.push({ id: 'facilities', label: 'Facilities' })
    if (fieldSchema.showAdminTab) tabs.push({ id: 'admin', label: 'Admin' })
    return tabs
  }, [
    showAdditionalTab,
    fieldSchema.showServiceTab,
    fieldSchema.showUsageTab,
    fieldSchema.showStepFreeTab,
    fieldSchema.stepFreeTabLabel,
    fieldSchema.showFacilitiesTab,
    fieldSchema.showAdminTab,
  ])

  useEffect(() => {
    if (activeTab === 'additional' && !showAdditionalTab) setActiveTab('details')
    if (activeTab === 'service' && !fieldSchema.showServiceTab) setActiveTab('details')
    if (activeTab === 'usage' && !fieldSchema.showUsageTab) setActiveTab('details')
    if (activeTab === 'stepFree' && !fieldSchema.showStepFreeTab) setActiveTab('details')
    if (activeTab === 'facilities' && !fieldSchema.showFacilitiesTab) setActiveTab('details')
    if (activeTab === 'admin' && !fieldSchema.showAdminTab) setActiveTab('details')
  }, [
    activeTab,
    showAdditionalTab,
    fieldSchema.showServiceTab,
    fieldSchema.showUsageTab,
    fieldSchema.showStepFreeTab,
    fieldSchema.showFacilitiesTab,
    fieldSchema.showAdminTab,
  ])

  useEffect(() => {
    if (!station) return
    document.title = `${station.stationName || 'Station'} | Rail Statistics`
  }, [station])

  useEffect(() => {
    // Full station document (usage, facilities, connections, location, etc.). Firebase is
    // imported dynamically so it stays off the initial parse, but it loads for every station
    // so all tabs have their data.
    if (!station) return
    let cancelled = false
    setAdditionalLoading(true)
    setAdditionalDoc(null)
    void import('@/services/firebase')
      .then(({ fetchStationDocumentById }) =>
        fetchStationDocumentById(
          station.id,
          getStationNetworkCollectionId(station, routeCollectionId ?? collectionId) ?? collectionId
        )
      )
      .then((data) => {
        if (cancelled) return
        setAdditionalDoc((data as SandboxStationDoc) ?? null)
      })
      .finally(() => {
        if (!cancelled) setAdditionalLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [station?.id, station?.sourceCollectionId, collectionId, routeCollectionId])

  useLayoutEffect(() => {
    const measureHeights = () => {
      const heights = measureTabs
        .map((tab) => {
          const pane = tabMeasureRefs.current[tab]
          if (!pane) return 0
          return Math.ceil(pane.getBoundingClientRect().height)
        })
        .filter((height) => height > 0)

      const visibleHeight = Math.ceil(visibleBodyRef.current?.getBoundingClientRect().height ?? 0)
      const nextMax = Math.max(visibleHeight, ...(heights.length > 0 ? heights : [0]))
      if (nextMax <= 0) return
      setMaxTabContentHeight((current) => (current === nextMax ? current : nextMax))
    }

    measureHeights()
    const frameA = window.requestAnimationFrame(measureHeights)
    const frameB = window.requestAnimationFrame(measureHeights)
    window.addEventListener('resize', measureHeights)
    return () => {
      window.cancelAnimationFrame(frameA)
      window.cancelAnimationFrame(frameB)
      window.removeEventListener('resize', measureHeights)
    }
  }, [station?.id, additionalDoc, additionalLoading, measureTabs])

  useEffect(() => {
    setMaxTabContentHeight(0)
  }, [station?.id])

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading station…</p>
        </div>
      </div>
    )
  }

  if (error && !station) {
    return (
      <div className="container">
        <div className="error-state">
          <h3>Failed to Load Station</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!network || !stationSlug || !station) {
    return (
      <div className="container">
        <div className="error-state">
          <h3>Station not found</h3>
          <p>We couldn’t find that station in the current data source.</p>
          <BUTWideButton type="button" width="hug" icon={<BackIcon />} onClick={() => router.push(backPath)}>
            Back to stations
          </BUTWideButton>
        </div>
      </div>
    )
  }

  return (
    <div className="container container--station-details">
      <PageTopHeader
        title={`Station details: ${(displayStation ?? station).stationName || 'Station'}`}
        subtitle={`${(displayStation ?? station).crsCode || 'No CRS'} · ID: ${station.id}${showPendingOverlay ? ' · Unpublished changes' : ''}`}
        actionContent={
          <div className="station-details-header-actions">
            <BUTWideButton
              type="button"
              width="hug"
              icon={<BackIcon />}
              onClick={() => router.push(backPath)}
            >
              Back
            </BUTWideButton>
            {canEdit && (
              <BUTCircleButton
                type="button"
                ariaLabel="Edit station"
                onClick={() => {
                  setStationDetailsNavigationState(navigationState)
                  router.push(`/admin/stations/${buildStationPath(station, collectionId)}/edit`)
                }}
                icon={<PencilSimple size={16} aria-hidden />}
              />
            )}
          </div>
        }
      />
      <div className="station-details-page">
        <div className="station-details-layout">
          <aside className="station-details-sidebar">
            <div className="station-details-sidebar-panel">
              <nav className="station-details-tabs" aria-label="Station sections">
                {sectionTabs.map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <div
                      key={tab.id}
                      className={[
                        'sidebar-dropdown',
                        'station-details-tab',
                        'rs-button--color-primary',
                        isActive ? 'station-details-tab--active' : 'station-details-tab--idle',
                      ].join(' ')}
                    >
                      <div className="sidebar-dropdown__header-row">
                        <button
                          type="button"
                          className="sidebar-dropdown__header"
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          <span className="sidebar-dropdown__title">{tab.label}</span>
                          <ChevronRightIcon className="sidebar-dropdown__chevron" aria-hidden />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </nav>
            </div>
          </aside>

          <main className="station-details-main">
            <section className="station-details-card modal-content">
              <div
                className="modal-body station-details-visible-body"
                ref={visibleBodyRef}
                style={maxTabContentHeight > 0 ? { minHeight: `${maxTabContentHeight}px` } : undefined}
              >
                <StationDetailsView
                  station={displayStation ?? station}
                  additionalDoc={displayAdditionalDoc}
                  additionalLoading={additionalLoading}
                  activeTab={activeTab}
                  fieldSchema={fieldSchema}
                  pendingFieldChanges={showPendingOverlay ? pendingFieldChanges : undefined}
                  isPendingNew={pendingEntry?.isNew === true}
                />
                <div className="station-details-measure-layer" aria-hidden="true">
                  {measureTabs.map((tab) => (
                    <div
                      key={tab}
                      className="station-details-measure-pane"
                      ref={(el) => {
                        tabMeasureRefs.current[tab] = el
                      }}
                    >
                      <StationDetailsView
                        station={displayStation ?? station}
                        additionalDoc={displayAdditionalDoc}
                        additionalLoading={additionalLoading}
                        activeTab={tab}
                        fieldSchema={fieldSchema}
                        pendingFieldChanges={showPendingOverlay ? pendingFieldChanges : undefined}
                        isPendingNew={pendingEntry?.isNew === true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default StationDetailsPage