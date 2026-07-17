'use client'

import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useStationDetailsRoute } from '@/hooks/useStationDetailsRoute'
import { useStationCollectionFieldSchema } from '@/hooks/useStationCollectionFieldSchema'
import type { SandboxStationDoc } from '@/types'
import { fetchStationDocumentById } from '@/services/firebase'
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
import { StationDetailsView } from '@/components/models'
import { StationDetailsEditForm } from '@/components/models'
import { BUTWideButton } from '@/components/buttons'
import { BUTCircleButton } from '@/components/buttons'
import { BackIcon } from '@/components/icons'
import { PageTopHeader } from '@/components/misc'
import '@/components/models/StationModal/StationModal.css'
import '@/components/models/StationEditModal/StationEditModal.css'
import { PencilSimple, Eye } from '@phosphor-icons/react'
import { paramAsString } from '@/utils/nextParams'
import { setStationDetailsNavigationState, readStationDetailsNavigationState } from '@/utils/clientNavigationState'
import './StationDetailsPage.css'

function getStationDetailsReturnPath(state: unknown): string {
  if (state && typeof state === 'object' && 'returnTo' in state) {
    const returnTo = (state as { returnTo?: unknown }).returnTo
    if (typeof returnTo === 'string' && returnTo.startsWith('/')) return returnTo
  }
  return '/admin/stations'
}

function AdminStationEditPage() {
  const mode = 'edit' as 'view' | 'edit'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const location = { pathname, search: searchParams.toString() ? `?${searchParams}` : '', state: null as unknown }
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
  const [isMobile, setIsMobile] = useState(false)
  const [editFormHasUnsavedChanges, setEditFormHasUnsavedChanges] = useState(false)
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
  const { fieldSchema: sampledFieldSchema, loading: schemaLoading } =
    useStationCollectionFieldSchema(schemaCollectionId)
  // Collection sample + this station's Firestore doc together restore every section tab.
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

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (activeTab === 'additional' && !showAdditionalTab) setActiveTab('details')
    if (activeTab === 'service' && !fieldSchema.showServiceTab) setActiveTab('details')
    if (activeTab === 'usage' && !fieldSchema.showUsageTab) setActiveTab('details')
    if (activeTab === 'stepFree' && !fieldSchema.showStepFreeTab) setActiveTab('details')
    if (activeTab === 'facilities' && !fieldSchema.showFacilitiesTab) setActiveTab('details')
  }, [
    activeTab,
    showAdditionalTab,
    fieldSchema.showServiceTab,
    fieldSchema.showUsageTab,
    fieldSchema.showStepFreeTab,
    fieldSchema.showFacilitiesTab,
  ])

  useEffect(() => {
    if (!station) return
    document.title =
      mode === 'edit'
        ? `Edit ${station.stationName || 'Station'} | Rail Statistics`
        : `${station.stationName || 'Station'} | Rail Statistics`
  }, [mode, station])

  useEffect(() => {
    if (!station) return
    let cancelled = false
    setAdditionalLoading(true)
    setAdditionalDoc(null)
    fetchStationDocumentById(
      station.id,
      getStationNetworkCollectionId(station, routeCollectionId ?? collectionId) ?? collectionId
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
    if (mode !== 'view') return

    const measureHeights = () => {
      const heights = visibleTabs
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
  }, [mode, station?.id, additionalDoc, additionalLoading, visibleTabs])

  useEffect(() => {
    setMaxTabContentHeight(0)
  }, [station?.id, mode])

  useEffect(() => {
    const visibleMap = document.querySelector('.station-details-visible-body .location-map-preview-osm') as HTMLElement | null
    const measureMap = document.querySelector('.station-details-measure-layer .location-map-preview-osm') as HTMLElement | null
    const visibleRect = visibleMap?.getBoundingClientRect()
    const measureRect = measureMap?.getBoundingClientRect()
  }, [mode, activeTab, isMobile, maxTabContentHeight, station?.id])

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
        title={`${mode === 'edit' ? 'Edit station' : 'Station details'}: ${(displayStation ?? station).stationName || 'Station'}`}
        subtitle={`${(displayStation ?? station).crsCode || 'No CRS'} · ID: ${station.id}${showPendingOverlay ? ' · Unpublished changes' : ''}`}
        actionContent={canEdit && !isMobile && mode === 'edit' ? <div id="station-details-header-actions" className="station-details-header-actions-slot" /> : undefined}
      />
      <div className="station-details-page">
        <div className="station-details-layout">
          <aside className="station-details-sidebar">
            <div className="station-details-sidebar-actions">
              <BUTWideButton
                type="button"
                width="hug"
                icon={<BackIcon />}
                onClick={() => {
                  if (mode === 'edit' && editFormHasUnsavedChanges && !window.confirm('Are you sure you want to go back? All data will not be saved.')) return
                  router.push(backPath)
                }}
              >
                Back
              </BUTWideButton>
              {canEdit && (
                <>
                  <div className="station-details-sidebar-actions-spacer" aria-hidden="true" />
                  {mode === 'view' ? (
                    <BUTCircleButton
                      type="button"
                      ariaLabel="Edit station"
                      onClick={() => {
                        setStationDetailsNavigationState(navigationState)
                        router.push(`/admin/stations/${buildStationPath(station, collectionId)}/edit`)
                      }}
                      icon={<PencilSimple size={16} aria-hidden />}
                    />
                  ) : (
                    <BUTCircleButton
                      type="button"
                      ariaLabel="View station"
                      onClick={() => {
                        setStationDetailsNavigationState(navigationState)
                        router.push(`/stations/${buildStationPath(station, collectionId)}`)
                      }}
                      icon={<Eye size={16} aria-hidden />}
                    />
                  )}
                </>
              )}
            </div>
            <div className="station-details-sidebar-secondary-actions">
              <div id="station-details-sidebar-actions" />
            </div>

            <nav className="station-details-tabs" aria-label="Station sections">
              <BUTWideButton
                type="button"
                width="hug"
                colorVariant="accent"
                className="station-details-tab"
                state={activeTab === 'details' ? 'active' : 'pressed'}
                onClick={() => setActiveTab('details')}
              >
                Details
              </BUTWideButton>
              {showAdditionalTab && (
                <BUTWideButton
                  type="button"
                  width="hug"
                  colorVariant="accent"
                  className="station-details-tab"
                  state={activeTab === 'additional' ? 'active' : 'pressed'}
                  onClick={() => setActiveTab('additional')}
                >
                  Additional details
                </BUTWideButton>
              )}
              {fieldSchema.showServiceTab && (
                <BUTWideButton
                  type="button"
                  width="hug"
                  colorVariant="accent"
                  className="station-details-tab"
                  state={activeTab === 'service' ? 'active' : 'pressed'}
                  onClick={() => setActiveTab('service')}
                >
                  Service & Connections
                </BUTWideButton>
              )}
              <BUTWideButton
                type="button"
                width="hug"
                colorVariant="accent"
                className="station-details-tab"
                state={activeTab === 'location' ? 'active' : 'pressed'}
                onClick={() => setActiveTab('location')}
              >
                Location
              </BUTWideButton>
              {fieldSchema.showUsageTab && (
                <BUTWideButton
                  type="button"
                  width="hug"
                  colorVariant="accent"
                  className="station-details-tab"
                  state={activeTab === 'usage' ? 'active' : 'pressed'}
                  onClick={() => setActiveTab('usage')}
                >
                  Usage
                </BUTWideButton>
              )}
              {fieldSchema.showStepFreeTab && (
                <BUTWideButton
                  type="button"
                  width="hug"
                  colorVariant="accent"
                  className="station-details-tab"
                  state={activeTab === 'stepFree' ? 'active' : 'pressed'}
                  onClick={() => setActiveTab('stepFree')}
                >
                  {fieldSchema.stepFreeTabLabel}
                </BUTWideButton>
              )}
              {fieldSchema.showFacilitiesTab && (
                <BUTWideButton
                  type="button"
                  width="hug"
                  colorVariant="accent"
                  className="station-details-tab"
                  state={activeTab === 'facilities' ? 'active' : 'pressed'}
                  onClick={() => setActiveTab('facilities')}
                >
                  Facilities
                </BUTWideButton>
              )}
            </nav>
          </aside>

          <main className="station-details-main">
            <section className={`station-details-card modal-content ${mode === 'edit' ? 'modal-content-edit' : ''}`}>
              {canEdit && mode === 'edit' ? (
                <StationDetailsEditForm
                  station={station}
                  pendingEntry={pendingEntry}
                  onCancel={() => router.push(backPath)}
                  onSaved={() => router.push(backPath)}
                  activeTab={activeTab}
                  fieldSchema={fieldSchema}
                  actionsPortalId={isMobile ? 'station-details-sidebar-actions' : 'station-details-header-actions'}
                  onUnsavedChangesChange={setEditFormHasUnsavedChanges}
                />
              ) : (
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
                    {visibleTabs.map((tab) => (
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
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminStationEditPage