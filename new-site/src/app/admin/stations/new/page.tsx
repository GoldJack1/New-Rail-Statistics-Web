'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { useNextStationId } from '@/hooks/useNextStationId'
import { useStationCollectionFieldSchema } from '@/hooks/useStationCollectionFieldSchema'
import { usePendingStationChanges } from '@/contexts/PendingStationChangesContext'
import { NewStationForm } from '@/components/models'
import { PageTopHeader } from '@/components/misc'
import ChooseNetworkForNewStationModal from '@/components/models/ChooseNetworkForNewStationModal/ChooseNetworkForNewStationModal'
import { stationDetailsShowsAdditionalTab, type StationDetailsTab } from '@/utils/stationCollectionFieldSchema'
import { BUTWideButton } from '@/components/buttons'
import { NETWORK_LABELS } from '@/constants/stationCollections'
import type { NetworkCollectionId } from '@/constants/stationCollections'
import type { NewStationNavigationState } from '@/types/newStationNavigation'
import {
  buildPendingNewStationDraftPrefill,
  isPendingNewStationEntry,
} from '@/utils/pendingNewStationEdit'
import '@/components/models/StationModal/StationModal.css'
import '@/components/models/StationEditModal/StationEditModal.css'
import { readNewStationNavigationState } from '@/utils/clientNavigationState'
import './StationDetailsPage.css'

interface NewStationPageContentProps {
  targetCollectionId: NetworkCollectionId
  onChangeNetwork: () => void
  initialLatitude?: number
  initialLongitude?: number
  returnTo?: string
  editPendingStationId?: string
}

const NewStationPageContent: React.FC<NewStationPageContentProps> = ({
  targetCollectionId,
  onChangeNetwork,
  initialLatitude,
  initialLongitude,
  returnTo,
  editPendingStationId,
}) => {
  const router = useRouter()
  const { pendingChanges } = usePendingStationChanges()
  const pendingEntry = editPendingStationId ? pendingChanges[editPendingStationId] : undefined
  const isEditDraft = Boolean(editPendingStationId && isPendingNewStationEntry(pendingEntry))
  const draftPrefill = useMemo(
    () =>
      isEditDraft && editPendingStationId && pendingEntry
        ? buildPendingNewStationDraftPrefill(editPendingStationId, pendingEntry)
        : null,
    [isEditDraft, editPendingStationId, pendingEntry]
  )
  const { fieldSchema, loading: schemaLoading } = useStationCollectionFieldSchema(targetCollectionId)
  const { nextStationId, loading: idLoading } = useNextStationId(targetCollectionId)
  const stationId = editPendingStationId ?? nextStationId
  const loading = schemaLoading || (!isEditDraft && idLoading)
  const showAdditionalTab = stationDetailsShowsAdditionalTab(fieldSchema)
  const [activeTab, setActiveTab] = useState<StationDetailsTab>(() =>
    initialLatitude != null && initialLongitude != null ? 'location' : 'details'
  )
  const [isMobile, setIsMobile] = useState(false)
  const [formIsDirty, setFormIsDirty] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    document.title = isEditDraft ? 'Edit draft station | Rail Statistics' : 'New Station | Rail Statistics'
  }, [isEditDraft])

  useEffect(() => {
    if (!editPendingStationId) return
    if (pendingEntry && isPendingNewStationEntry(pendingEntry)) return
    router.replace(returnTo ?? '/admin/stations/pending-review')
  }, [editPendingStationId, pendingEntry, router, returnTo])

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

  if (loading) {
    return (
      <div className="container container--station-details">
        <PageTopHeader
          title={isEditDraft ? 'Edit unpublished station' : 'Add new station'}
          subtitle={NETWORK_LABELS[targetCollectionId]}
        />
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container container--station-details">
      <PageTopHeader
        title={isEditDraft ? 'Edit unpublished station' : 'Add new station'}
        subtitle={
          <>
            {isEditDraft ? 'Draft ID' : 'New ID'}: {stationId}
            <span> · {NETWORK_LABELS[targetCollectionId]}</span>
            {isEditDraft && <span> · Not yet published</span>}
          </>
        }
        actionContent={
          !isMobile ? (
            <div id="station-details-header-actions" className="station-details-header-actions-slot" />
          ) : undefined
        }
      />
      <div className="station-details-page">
        <div className="station-details-layout">
          <aside className="station-details-sidebar">
            <div className="station-details-sidebar-actions">
              <BUTWideButton
                type="button"
                width="hug"
                onClick={() => {
                  if (formIsDirty && !window.confirm('Are you sure you want to go back? All data will not be saved.')) return
                  if (returnTo) {
                    router.push(returnTo)
                    return
                  }
                  router.back()
                }}
              >
                Back
              </BUTWideButton>
              {!isEditDraft && (
                <BUTWideButton
                  type="button"
                  width="hug"
                  onClick={() => {
                    if (formIsDirty && !window.confirm('Change network? Unsaved data will be lost.')) return
                    onChangeNetwork()
                  }}
                >
                  Change network
                </BUTWideButton>
              )}
            </div>
            <div className="station-details-sidebar-secondary-actions">
              <div id="station-details-sidebar-actions" />
            </div>
            <nav className="station-details-tabs" aria-label="Form sections">
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
            <section className="station-details-card modal-content modal-content-edit">
              <NewStationForm
                nextStationId={stationId}
                targetCollectionId={targetCollectionId}
                onCancel={() => (returnTo ? router.push(returnTo) : router.back())}
                onCreated={() => router.push(returnTo ?? '/admin/stations/pending-review')}
                activeTab={activeTab}
                hideNetworkPicker
                actionsPortalId={isMobile ? 'station-details-sidebar-actions' : 'station-details-header-actions'}
                onDirtyChange={setFormIsDirty}
                fieldSchema={fieldSchema}
                initialLatitude={initialLatitude}
                initialLongitude={initialLongitude}
                draftPrefill={draftPrefill}
              />
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

const NewStationPage: React.FC = () => {
  const router = useRouter()
  const navState = readNewStationNavigationState()
  const editPendingStationId = navState?.editPendingStationId
  const [targetCollectionId, setTargetCollectionId] = useState<NetworkCollectionId | null>(
    () => navState?.targetCollectionId ?? null
  )

  if (!targetCollectionId) {
    return (
      <ChooseNetworkForNewStationModal
        open
        onConfirm={setTargetCollectionId}
        onCancel={() => (navState?.returnTo ? router.push(navState.returnTo) : router.back())}
      />
    )
  }

  return (
    <NewStationPageContent
      targetCollectionId={targetCollectionId}
      onChangeNetwork={() => setTargetCollectionId(null)}
      initialLatitude={navState?.latitude}
      initialLongitude={navState?.longitude}
      returnTo={navState?.returnTo}
      editPendingStationId={editPendingStationId}
    />
  )
}

export default NewStationPage