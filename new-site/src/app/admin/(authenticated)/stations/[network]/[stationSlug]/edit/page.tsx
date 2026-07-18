'use client'

import { useRouter, useParams } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { useStationDetailsRoute } from '@/hooks/useStationDetailsRoute'
import { useStationCollectionFieldSchema } from '@/hooks/useStationCollectionFieldSchema'
import { useKnowledgebaseStation } from '@/hooks/useKnowledgebaseStation'
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
  mergeStationWithPendingUpdate,
} from '@/utils/applyPendingChangesForDisplay'
import {
  EMPTY_STATION_COLLECTION_FIELD_SCHEMA,
  inferStationCollectionFieldSchema,
  mergeStationCollectionFieldSchemas,
  stationDetailsShowsAdditionalTab,
  type StationDetailsTab,
} from '@/utils/stationCollectionFieldSchema'
import { StationDetailsEditForm } from '@/components/models'
import StationKnowledgebasePanel from '@/components/models/StationDetails/StationKnowledgebasePanel'
import StationDetailsSectionNav from '@/components/models/StationDetails/StationDetailsSectionNav'
import { BUTWideButton } from '@/components/buttons'
import { BUTCircleButton } from '@/components/buttons'
import { BackIcon } from '@/components/icons'
import { PageTopHeader } from '@/components/misc'
import '@/components/models/StationModal/StationModal.css'
import '@/components/models/StationEditModal/StationEditModal.css'
import { Eye } from '@phosphor-icons/react'
import { paramAsString } from '@/utils/nextParams'
import { setStationDetailsNavigationState, readStationDetailsNavigationState } from '@/utils/clientNavigationState'
import {
  isKnowledgebaseTabId,
  KNOWLEDGEBASE_OVERVIEW_KEY,
  parseKnowledgebaseTabId,
  toKnowledgebaseTabId,
} from '@/utils/knowledgebaseStationSections'
import '@/components/models/StationDetails/StationKnowledgebasePanel.css'
import '@/app/stations/[network]/[stationSlug]/StationDetailsPage.css'

function getStationDetailsReturnPath(state: unknown): string {
  if (state && typeof state === 'object' && 'returnTo' in state) {
    const returnTo = (state as { returnTo?: unknown }).returnTo
    if (typeof returnTo === 'string' && returnTo.startsWith('/')) return returnTo
  }
  return '/admin/stations'
}

function AdminStationEditPage() {
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
  const [activeTab, setActiveTab] = useState<StationDetailsTab>('details')
  const [editFormHasUnsavedChanges, setEditFormHasUnsavedChanges] = useState(false)

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
  const { fieldSchema: sampledFieldSchema } = useStationCollectionFieldSchema(schemaCollectionId)
  // Collection sample + this station's Firestore doc together restore every section tab.
  const fieldSchema = useMemo(() => {
    const base =
      sampledFieldSchema.defaultStnarea !== '' ? sampledFieldSchema : catalogFieldSchema
    if (!additionalDoc || !schemaCollectionId) return base
    const fromStationDoc = inferStationCollectionFieldSchema(
      [additionalDoc as Record<string, unknown>],
      schemaCollectionId
    )
    return mergeStationCollectionFieldSchemas(base, fromStationDoc)
  }, [catalogFieldSchema, sampledFieldSchema, additionalDoc, schemaCollectionId])
  const showAdditionalTab = stationDetailsShowsAdditionalTab(fieldSchema)
  const knowledgebase = useKnowledgebaseStation(
    station?.crsCode,
    fieldSchema.showKnowledgebaseTab
  )
  const sectionTabs = useMemo(() => {
    const tabs: Array<{
      id: StationDetailsTab
      label: string
      knowledgebase?: boolean
      sectionKey?: string
    }> = [{ id: 'details', label: 'Details' }]
    if (showAdditionalTab) tabs.push({ id: 'additional', label: 'Additional details' })
    if (fieldSchema.showServiceTab) tabs.push({ id: 'service', label: 'Service & Connections' })
    tabs.push({ id: 'location', label: 'Location' })
    if (fieldSchema.showUsageTab) tabs.push({ id: 'usage', label: 'Station Usage' })
    if (fieldSchema.showStepFreeTab) tabs.push({ id: 'stepFree', label: fieldSchema.stepFreeTabLabel })
    if (fieldSchema.showFacilitiesTab) tabs.push({ id: 'facilities', label: 'Facilities' })
    if (fieldSchema.showKnowledgebaseTab && knowledgebase.status === 'ready') {
      for (const section of knowledgebase.sections) {
        if (section.key === KNOWLEDGEBASE_OVERVIEW_KEY) continue
        tabs.push({
          id: toKnowledgebaseTabId(section.key),
          label: section.label,
          knowledgebase: true,
          sectionKey: section.key,
        })
      }
    } else if (fieldSchema.showKnowledgebaseTab) {
      tabs.push({
        id: toKnowledgebaseTabId('__loading__'),
        label: knowledgebase.status === 'error' ? 'KB (error)' : 'KB (loading…)',
        knowledgebase: true,
        sectionKey: '__loading__',
      })
    }
    if (fieldSchema.showAdminTab) tabs.push({ id: 'admin', label: 'Admin' })
    return tabs
  }, [
    showAdditionalTab,
    fieldSchema.showServiceTab,
    fieldSchema.showUsageTab,
    fieldSchema.showStepFreeTab,
    fieldSchema.stepFreeTabLabel,
    fieldSchema.showFacilitiesTab,
    fieldSchema.showKnowledgebaseTab,
    fieldSchema.showAdminTab,
    knowledgebase,
  ])

  const activeKnowledgebaseSection = useMemo(() => {
    if (!isKnowledgebaseTabId(activeTab) || knowledgebase.status !== 'ready') return null
    const key = parseKnowledgebaseTabId(activeTab)
    if (!key || key === KNOWLEDGEBASE_OVERVIEW_KEY) return null
    return knowledgebase.sections.find((section) => section.key === key) ?? null
  }, [activeTab, knowledgebase])

  useEffect(() => {
    if (activeTab === 'additional' && !showAdditionalTab) setActiveTab('details')
    if (activeTab === 'service' && !fieldSchema.showServiceTab) setActiveTab('details')
    if (activeTab === 'usage' && !fieldSchema.showUsageTab) setActiveTab('details')
    if (activeTab === 'stepFree' && !fieldSchema.showStepFreeTab) setActiveTab('details')
    if (activeTab === 'facilities' && !fieldSchema.showFacilitiesTab) setActiveTab('details')
    if (isKnowledgebaseTabId(activeTab) && !fieldSchema.showKnowledgebaseTab) setActiveTab('details')
    if (
      isKnowledgebaseTabId(activeTab) &&
      knowledgebase.status === 'ready' &&
      !activeKnowledgebaseSection &&
      parseKnowledgebaseTabId(activeTab) !== '__loading__' &&
      parseKnowledgebaseTabId(activeTab) !== KNOWLEDGEBASE_OVERVIEW_KEY
    ) {
      setActiveTab('details')
    }
    if (activeTab === 'admin' && !fieldSchema.showAdminTab) setActiveTab('details')
  }, [
    activeTab,
    showAdditionalTab,
    fieldSchema.showServiceTab,
    fieldSchema.showUsageTab,
    fieldSchema.showStepFreeTab,
    fieldSchema.showFacilitiesTab,
    fieldSchema.showKnowledgebaseTab,
    fieldSchema.showAdminTab,
    knowledgebase.status,
    activeKnowledgebaseSection,
  ])

  useEffect(() => {
    if (!station) return
    document.title = `Edit ${station.stationName || 'Station'} | Rail Statistics`
  }, [station])

  useEffect(() => {
    if (!station) return
    let cancelled = false
    setAdditionalDoc(null)
    fetchStationDocumentById(
      station.id,
      getStationNetworkCollectionId(station, routeCollectionId ?? collectionId) ?? collectionId
    )
      .then((data) => {
        if (cancelled) return
        setAdditionalDoc((data as SandboxStationDoc) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [station?.id, station?.sourceCollectionId, collectionId, routeCollectionId])

  if (loading) {
    return (
      <div className="container container--station-details">
        <PageTopHeader
          title="Loading station"
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
            </div>
          }
        />
      </div>
    )
  }

  if (error && !station) {
    return (
      <div className="container container--station-details">
        <PageTopHeader
          title="Failed to load station"
          subtitle={error}
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
            </div>
          }
        />
      </div>
    )
  }

  if (!network || !stationSlug || !station) {
    return (
      <div className="container container--station-details">
        <PageTopHeader
          title="Station not found"
          subtitle="We couldn’t find that station in the current data source."
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
            </div>
          }
        />
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="container container--station-details">
        <PageTopHeader
          title="Sign in required"
          subtitle="You need to be signed in to edit this station."
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
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="container container--station-details">
      <PageTopHeader
        title={`Edit station: ${(displayStation ?? station).stationName || 'Station'}`}
        subtitle={`${(displayStation ?? station).crsCode || 'No CRS'} · ID: ${station.id}${showPendingOverlay ? ' · Unpublished changes' : ''}`}
        actionContent={
          <div className="station-details-header-actions">
            <BUTWideButton
              type="button"
              width="hug"
              icon={<BackIcon />}
              onClick={() => {
                if (editFormHasUnsavedChanges && !window.confirm('Are you sure you want to go back? All data will not be saved.')) return
                router.push(backPath)
              }}
            >
              Back
            </BUTWideButton>
            <BUTCircleButton
              type="button"
              ariaLabel="View station"
              onClick={() => {
                if (editFormHasUnsavedChanges && !window.confirm('Are you sure you want to leave edit mode? Unsaved changes will not be saved.')) return
                setStationDetailsNavigationState(navigationState)
                router.push(`/stations/${buildStationPath(station, collectionId)}`)
              }}
              icon={<Eye size={16} aria-hidden />}
            />
            <div id="station-details-header-actions" className="station-details-header-actions-slot" />
          </div>
        }
      />
      <div className="station-details-page">
        <div className="station-details-layout">
          <StationDetailsSectionNav
            tabs={sectionTabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
            ariaLabel="Station sections"
          />

          <main className="station-details-main">
            <section className="station-details-card modal-content modal-content-edit">
              <div
                hidden={isKnowledgebaseTabId(activeTab)}
                aria-hidden={isKnowledgebaseTabId(activeTab)}
              >
                <StationDetailsEditForm
                  station={station}
                  pendingEntry={pendingEntry}
                  onCancel={() => router.push(backPath)}
                  onSaved={() => router.push(backPath)}
                  activeTab={isKnowledgebaseTabId(activeTab) ? 'details' : activeTab}
                  fieldSchema={fieldSchema}
                  actionsPortalId="station-details-header-actions"
                  onUnsavedChangesChange={setEditFormHasUnsavedChanges}
                  knowledgebaseNlc={
                    knowledgebase.status === 'ready' ? knowledgebase.nlc : null
                  }
                  knowledgebaseStationOperator={
                    knowledgebase.status === 'ready' ? knowledgebase.stationOperator : null
                  }
                  knowledgebaseStationAlert={
                    knowledgebase.status === 'ready' ? knowledgebase.stationAlert : null
                  }
                  knowledgebaseStatus={knowledgebase.status}
                />
              </div>
              {isKnowledgebaseTabId(activeTab) ? (
                <div className="modal-body">
                  {activeKnowledgebaseSection ? (
                    <StationKnowledgebasePanel
                      sectionKey={activeKnowledgebaseSection.key}
                      label={activeKnowledgebaseSection.label}
                      value={activeKnowledgebaseSection.value}
                      crs={knowledgebase.status === 'ready' ? knowledgebase.crs : station.crsCode}
                      fetchedAt={
                        knowledgebase.status === 'ready' ? knowledgebase.fetchedAt : undefined
                      }
                      lastUpdatedLabel={
                        knowledgebase.status === 'ready' ? knowledgebase.lastUpdatedLabel : null
                      }
                      showSourceHint
                      status={knowledgebase.status}
                      errorMessage={
                        knowledgebase.status === 'error' ? knowledgebase.message : undefined
                      }
                      readOnly
                    />
                  ) : (
                    <StationKnowledgebasePanel
                      label={
                        knowledgebase.status === 'error'
                          ? 'Knowledgebase (error)'
                          : 'Knowledgebase'
                      }
                      value={{}}
                      crs={station.crsCode}
                      status={knowledgebase.status === 'error' ? 'error' : 'loading'}
                      errorMessage={
                        knowledgebase.status === 'error' ? knowledgebase.message : undefined
                      }
                      readOnly
                    />
                  )}
                </div>
              ) : null}
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminStationEditPage