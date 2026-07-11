'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import React, { useCallback, useMemo, useState } from 'react'

import { useStations } from '@/hooks/useStations'
import { BUTWideButton } from '@/components/buttons'
import { PageTopHeader } from '@/components/misc'
import PendingChangesReviewPanel, {
  type PendingReviewPageActionBarApi,
  type PendingReviewPageTab
} from '@/components/models/PendingChangesReviewPanel/PendingChangesReviewPanel'
import { usePendingStationChanges } from '@/contexts/PendingStationChangesContext'
import { useStationCollection } from '@/contexts/StationCollectionContext'
import { getStationCollectionDisplayLabel } from '@/services/firebase'
import { NETWORK_COLLECTION_IDS } from '@/constants/stationCollections'
import { countPendingChangesForCollection } from '@/utils/pendingChangesByCollection'
import { safeReviewPendingReturnPath } from '@/utils/reviewPendingNavigation'
import './StationDetailsPage.css'
import './ReviewPendingChangesPage.css'

const ReviewPendingChangesPage: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const location = { pathname, search: searchParams.toString() ? `?${searchParams}` : '', state: null as unknown }
  const { loading, error, refetch } = useStations()
  const { pendingChanges } = usePendingStationChanges()
  const { collectionId, networkView } = useStationCollection()
  const pendingCount = useMemo(() => {
    if (networkView === 'all') {
      return NETWORK_COLLECTION_IDS.reduce(
        (sum, id) => sum + countPendingChangesForCollection(pendingChanges, id),
        0
      )
    }
    return countPendingChangesForCollection(pendingChanges, collectionId)
  }, [pendingChanges, collectionId, networkView])
  const collectionLabel = getStationCollectionDisplayLabel(collectionId)
  const [reviewTab, setReviewTab] = useState<PendingReviewPageTab>('pending')
  const [pageActionBarApi, setPageActionBarApi] = useState<PendingReviewPageActionBarApi | null>(null)

  const fromState = safeReviewPendingReturnPath(searchParams.get('from'))
  const fallbackBackTarget =
    fromState && fromState !== '/admin/stations/pending-review' ? fromState : '/admin/stations'

  const goBackToPreviousPage = useCallback(() => {
    // Prefer explicit in-app origin captured when opening pending review.
    if (fromState && fromState !== '/admin/stations/pending-review') {
      router.replace(fromState)
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(fallbackBackTarget)
  }, [router, fromState, fallbackBackTarget])

  const pendingSubtitle = (
    <span className="review-pending-page__header-subtitle">
      <span>
        {pendingCount > 0
          ? `${pendingCount} local edit${pendingCount === 1 ? '' : 's'} — use the Pending changes tab to publish or schedule per station; server jobs live under Schedules.`
          : 'No staged edits — open the Schedules tab to view or cancel server publish jobs.'}
      </span>
      <span className="review-pending-page__collection-line">
        Data source: <span className="review-pending-page__collection-name">{collectionLabel}</span>
      </span>
    </span>
  )

  const renderHeaderActions = (api: PendingReviewPageActionBarApi | null) => (
    <div
      className="review-pending-page__action-bar review-pending-page__action-bar--in-header"
      role="toolbar"
      aria-label="Review navigation and publish actions"
    >
      <div className="review-pending-page__action-bar-back">
        <BUTWideButton type="button" width="hug" instantAction onClick={goBackToPreviousPage}>
          Back
        </BUTWideButton>
      </div>
      {reviewTab === 'pending' && api ? (
        <>
          <div className="review-pending-page__action-bar-spacer" aria-hidden="true" />
          <div className="review-pending-page__action-bar-end" role="group" aria-label="Publish and schedule">
          <BUTWideButton
            type="button"
            width="hug"
            instantAction
            onClick={api.openPublishModal}
            disabled={api.publishDisabled}
          >
            Publish now
          </BUTWideButton>
          <BUTWideButton
            type="button"
            width="hug"
            instantAction
            onClick={api.openScheduleModal}
            disabled={api.scheduleDisabled}
          >
            Schedule
          </BUTWideButton>
        </div>
        </>
      ) : null}
    </div>
  )

  if (loading) {
    return (
      <div className="container container--station-details review-pending-page">
        <PageTopHeader
          title="Review pending changes"
          subtitle={`Data source: ${collectionLabel}`}
          actionContent={renderHeaderActions(null)}
        />
        <div className="review-pending-page__state">
          <div className="loading-spinner" />
          <p>Loading…</p>
          <p className="review-pending-page__collection-note">Data source: {collectionLabel}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container container--station-details review-pending-page">
        <PageTopHeader
          title="Review pending changes"
          subtitle={`Data source: ${collectionLabel}`}
          actionContent={renderHeaderActions(null)}
        />
        <div className="review-pending-page__state review-pending-page__state--error">
          <p>{error}</p>
          <p className="review-pending-page__collection-note">Data source: {collectionLabel}</p>
          <BUTWideButton width="hug" onClick={() => void refetch()}>
            Try again
          </BUTWideButton>
        </div>
      </div>
    )
  }

  return (
    <div className="container container--station-details review-pending-page">
      <PageTopHeader
        title="Review pending changes"
        subtitle={pendingSubtitle}
        actionContent={renderHeaderActions(pageActionBarApi)}
      />
      <div className="station-details-page">
        <main className="station-details-main review-pending-page__main">
          <PendingChangesReviewPanel
            visible
            reviewActive
            layout="page"
            refetch={refetch}
            onPublishSuccess={goBackToPreviousPage}
            pageTab={reviewTab}
            onPageTabChange={setReviewTab}
            onPageActionBarApi={setPageActionBarApi}
          />
        </main>
      </div>
    </div>
  )
}

export default ReviewPendingChangesPage