'use client'

import { useRouter, useParams } from 'next/navigation'
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useStationDetailsRoute } from '@/hooks/useStationDetailsRoute'
import { useStationCollectionFieldSchema } from '@/hooks/useStationCollectionFieldSchema'
import { useKnowledgebaseStation } from '@/hooks/useKnowledgebaseStation'
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
import StationDetailsSectionNav from '@/components/models/StationDetails/StationDetailsSectionNav'
import { BUTWideButton } from '@/components/buttons'
import { BUTCircleButton } from '@/components/buttons'
import { BackIcon } from '@/components/icons'
import PageTopHeader from '@/components/misc/PageTopHeader/PageTopHeader'
import { LightRailLineChips } from '@/components/chips/LightRailLineChips'
import '@/components/models/StationModal/StationModal.css'
import { PencilSimple } from '@phosphor-icons/react'
import { paramAsString } from '@/utils/nextParams'
import { setStationDetailsNavigationState, readStationDetailsNavigationState } from '@/utils/clientNavigationState'
import { formatStationDetailsHeaderManagedByToc, formatStationDetailsHeaderSubtitle, getStationDetailsHeaderToc } from '@/utils/formatStationDetailsHeader'
import { isLightRailStop } from '@/utils/stationCardForNetwork'
import { useTocOperators } from '@/hooks/useTocOperators'
import { resolveTocOperatorDisplayName } from '@/services/tocOperators'
import { parseStationTocValues } from '@/components/models/StationDetails/StationTocChips'
import {
  isKnowledgebaseTabId,
  KNOWLEDGEBASE_OVERVIEW_KEY,
  parseKnowledgebaseTabId,
  toKnowledgebaseTabId,
} from '@/utils/knowledgebaseStationSections'
import '@/components/models/StationDetails/StationKnowledgebasePanel.css'
import {
  readKnowledgebaseSourceCompareEnabled,
  writeKnowledgebaseSourceCompareEnabled,
  SOURCE_COMPARE_CHANGED_EVENT,
} from '@/utils/knowledgebaseSourceCompareStorage'
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
  const [sourceCompareEnabled, setSourceCompareEnabled] = useState(false)
  const visibleBodyRef = useRef<HTMLDivElement | null>(null)
  const tabMeasureRefs = useRef<Partial<Record<StationDetailsTab, HTMLDivElement | null>>>({})

  useEffect(() => {
    const sync = () => setSourceCompareEnabled(readKnowledgebaseSourceCompareEnabled())
    sync()
    window.addEventListener(SOURCE_COMPARE_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(SOURCE_COMPARE_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

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
  const { fieldSchema: sampledFieldSchema } = useStationCollectionFieldSchema(schemaCollectionId)
  const fieldSchema = useMemo(() => {
    // Hook already paints catalog (or cache) immediately — never swap back to a thinner schema
    // while the collection sample loads (that was flashing empty optional rows).
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
  const visibleTabs = useMemo(() => getVisibleStationDetailsTabs(fieldSchema), [fieldSchema])

  const knowledgebase = useKnowledgebaseStation(
    station?.crsCode,
    fieldSchema.showKnowledgebaseTab
  )

  // Measuring the location tab mounts Leaflet/ORM tiles — skip it for height measurement.
  // Knowledgebase section tabs are skipped (content height varies / already prefetched).
  const measureTabs = useMemo(
    () => visibleTabs.filter((tab) => tab !== 'location' && !isKnowledgebaseTabId(tab)),
    [visibleTabs]
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
      // Placeholder while KB loads so the sidebar shows KB is coming.
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

  const knowledgebaseStationOperator =
    knowledgebase.status === 'ready' ? knowledgebase.stationOperator : null
  const knowledgebaseNlc = knowledgebase.status === 'ready' ? knowledgebase.nlc : null
  const knowledgebasePostalAddress =
    knowledgebase.status === 'ready' ? knowledgebase.postalAddress : null
  const knowledgebaseStationAlert =
    knowledgebase.status === 'ready' ? knowledgebase.stationAlert : null
  const knowledgebaseLastUpdatedLabel =
    knowledgebase.status === 'ready' ? knowledgebase.lastUpdatedLabel : null

  const headerDisplayStation = displayStation ?? station
  const headerIsLightRail = Boolean(headerDisplayStation && isLightRailStop(headerDisplayStation))
  const headerTocRaw = headerDisplayStation ? getStationDetailsHeaderToc(headerDisplayStation) : ''
  const headerTocPrimary = parseStationTocValues(headerTocRaw)[0] ?? headerTocRaw
  const tocOperators = useTocOperators(Boolean(headerDisplayStation) && !headerIsLightRail && Boolean(headerTocPrimary))
  const headerManagedByToc = useMemo(() => {
    if (!headerDisplayStation || headerIsLightRail) return ''
    const displayName = headerTocPrimary
      ? resolveTocOperatorDisplayName(tocOperators.operators, headerTocPrimary)
      : ''
    const tocCode = !fieldSchema.showKnowledgebaseTab
      ? null
      : knowledgebase.status === 'loading' || knowledgebase.status === 'idle'
        ? '…'
        : knowledgebaseStationOperator
    return formatStationDetailsHeaderManagedByToc(displayName || headerTocPrimary, tocCode)
  }, [
    headerDisplayStation,
    headerIsLightRail,
    headerTocPrimary,
    tocOperators.operators,
    fieldSchema.showKnowledgebaseTab,
    knowledgebase.status,
    knowledgebaseStationOperator,
  ])

  const headerEyebrow = useMemo(() => {
    if (!headerDisplayStation) return undefined
    if (headerIsLightRail) {
      const toc = headerTocRaw
      if (!toc && !headerDisplayStation.linesServed) return undefined
      return (
        <>
          {toc ? <span className="station-details-header-toc">{toc}</span> : null}
          <LightRailLineChips
            linesServed={headerDisplayStation.linesServed}
            className="station-details-header-line-chips"
            labelSuffix=" Route"
          />
        </>
      )
    }
    if (!headerManagedByToc) return undefined
    return (
      <span className="station-details-header-managed-by">
        <span className="station-details-header-managed-by__label">Station Managed by:</span>
        <span className="station-details-header-managed-by__toc">{headerManagedByToc}</span>
      </span>
    )
  }, [headerDisplayStation, headerIsLightRail, headerTocRaw, headerManagedByToc])

  useEffect(() => {
    if (activeTab === 'additional' && !showAdditionalTab) setActiveTab('details')
    if (activeTab === 'service' && !fieldSchema.showServiceTab) setActiveTab('details')
    if (activeTab === 'usage' && !fieldSchema.showUsageTab) setActiveTab('details')
    if (activeTab === 'stepFree' && !fieldSchema.showStepFreeTab) setActiveTab('details')
    if (activeTab === 'facilities' && !fieldSchema.showFacilitiesTab) setActiveTab('details')
    if (isKnowledgebaseTabId(activeTab) && !fieldSchema.showKnowledgebaseTab) setActiveTab('details')
    if (
      isKnowledgebaseTabId(activeTab) &&
      parseKnowledgebaseTabId(activeTab) === KNOWLEDGEBASE_OVERVIEW_KEY
    ) {
      setActiveTab(fieldSchema.showAdminTab ? 'admin' : 'details')
    }
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
        eyebrow={headerEyebrow}
        title={(displayStation ?? station).stationName || 'Station'}
        subtitle={formatStationDetailsHeaderSubtitle(displayStation ?? station, {
          pendingSuffix: showPendingOverlay ? 'Unpublished changes' : null,
        })}
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
      <div
        className={[
          'station-details-page',
          fieldSchema.showKnowledgebaseTab && sourceCompareEnabled
            ? 'station-details--source-compare'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="station-details-layout">
          <StationDetailsSectionNav
            tabs={sectionTabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
            ariaLabel="Station sections"
            markFirebaseTabs={fieldSchema.showKnowledgebaseTab}
          />

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
                  knowledgebaseSection={activeKnowledgebaseSection}
                  knowledgebaseSections={
                    knowledgebase.status === 'ready' ? knowledgebase.sections : []
                  }
                  knowledgebaseStatus={knowledgebase.status}
                  knowledgebaseError={
                    knowledgebase.status === 'error' ? knowledgebase.message : undefined
                  }
                  knowledgebaseCrs={
                    knowledgebase.status === 'ready' ? knowledgebase.crs : station.crsCode
                  }
                  knowledgebaseFetchedAt={
                    knowledgebase.status === 'ready' ? knowledgebase.fetchedAt : undefined
                  }
                  knowledgebaseLastUpdatedLabel={knowledgebaseLastUpdatedLabel}
                  knowledgebaseShowSourceHintForAdmin={canEdit}
                  knowledgebaseStationOperator={knowledgebaseStationOperator}
                  knowledgebaseNlc={knowledgebaseNlc}
                  knowledgebasePostalAddress={knowledgebasePostalAddress}
                  knowledgebaseStationAlert={knowledgebaseStationAlert}
                  sourceCompareEnabled={sourceCompareEnabled}
                  onSourceCompareChange={(enabled) => {
                    writeKnowledgebaseSourceCompareEnabled(enabled)
                    setSourceCompareEnabled(enabled)
                  }}
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
                        knowledgebaseStatus={knowledgebase.status}
                        knowledgebasePostalAddress={knowledgebasePostalAddress}
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