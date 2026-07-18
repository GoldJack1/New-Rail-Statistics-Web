'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { useNextStationId } from '@/hooks/useNextStationId'
import { useStationCollectionFieldSchema } from '@/hooks/useStationCollectionFieldSchema'
import { usePendingStationChanges } from '@/hooks/usePendingStationChanges'
import { NewStationForm } from '@/components/models'
import { PageTopHeader } from '@/components/misc'
import ChooseNetworkForNewStationModal from '@/components/models/ChooseNetworkForNewStationModal/ChooseNetworkForNewStationModal'
import { stationDetailsShowsAdditionalTab, type StationDetailsTab } from '@/utils/stationCollectionFieldSchema'
import { BUTWideButton } from '@/components/buttons'
import { BackIcon, ChevronRightIcon } from '@/components/icons'
import { NETWORK_LABELS } from '@/constants/stationCollections'
import type { NetworkCollectionId } from '@/constants/stationCollections'
import type { NewStationNavigationState } from '@/types/newStationNavigation'
import {
  buildPendingNewStationDraftPrefill,
  isPendingNewStationEntry,
} from '@/utils/pendingNewStationEdit'
import '@/components/misc/SidebarDropdownSection/SidebarDropdownSection.css'
import '@/components/models/StationModal/StationModal.css'
import '@/components/models/StationEditModal/StationEditModal.css'
import { readNewStationNavigationState } from '@/utils/clientNavigationState'
import '@/app/stations/[network]/[stationSlug]/StationDetailsPage.css'

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
  const [formIsDirty, setFormIsDirty] = useState(false)
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
          <div className="station-details-header-actions">
            <BUTWideButton
              type="button"
              width="hug"
              icon={<BackIcon />}
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
            <div id="station-details-header-actions" className="station-details-header-actions-slot" />
          </div>
        }
      />
      <div className="station-details-page">
        <div className="station-details-layout">
          <aside className="station-details-sidebar">
            <div className="station-details-sidebar-panel">
              <nav className="station-details-tabs" aria-label="Form sections">
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
            <section className="station-details-card modal-content modal-content-edit">
              <NewStationForm
                nextStationId={stationId}
                targetCollectionId={targetCollectionId}
                onCancel={() => (returnTo ? router.push(returnTo) : router.back())}
                onCreated={() => router.push(returnTo ?? '/admin/stations/pending-review')}
                activeTab={activeTab}
                hideNetworkPicker
                actionsPortalId="station-details-header-actions"
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