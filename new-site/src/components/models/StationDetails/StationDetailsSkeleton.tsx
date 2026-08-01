'use client'

import React from 'react'
import { Skeleton } from '@/components/misc/Skeleton/Skeleton'
import { TextSkeletonLine } from '@/components/misc/Skeleton/TextSkeletonLine'
import { BUTOperatorChip, BUTWideButton } from '@/components/buttons'
import type { StationDetailsSectionTab } from '@/components/models/StationDetails/StationDetailsSectionNav'
import {
  KNOWLEDGEBASE_SIDEBAR_SECTION_PLACEHOLDERS,
  toKnowledgebaseTabId,
} from '@/utils/knowledgebaseStationSections'
import './StationDetailsSkeleton.css'

const CODE_CHIP_PLACEHOLDERS: Array<{
  key: 'CRS' | 'TIPLOC' | 'NLC'
  text: string
  knowledgebase?: boolean
}> = [
  { key: 'CRS', text: 'CRS: XXX' },
  { key: 'TIPLOC', text: 'TIPLOC: XXXXX' },
  { key: 'NLC', text: 'NLC: 000000', knowledgebase: true },
]

const PLACE_FIELDS = [
  { label: 'Country', value: 'England' },
  { label: 'County', value: 'Greater London' },
  { label: 'Borough', value: 'Greenwich' },
  { label: 'Fare zone', value: 'Zone 4' },
] as const

const OTHER_FIELDS = [
  { label: 'Operator code', value: 'XR' },
  { label: 'Min connection time', value: '5 mins' },
  { label: 'Province', value: 'England' },
  { label: 'Postcode', value: 'SE2 9RH' },
] as const

const TOC_CHIP_PLACEHOLDERS = ['Elizabeth Line', 'Southeastern', 'Thameslink'] as const

const SOURCE_HINT_LINES = [
  'Station details are compiled from National Rail Enquiries Knowledgebase and Rail Statistics records.',
  'The data shown on this page was last updated by National Rail Enquiries on 16th July 2026 at 09:46.',
] as const

function FieldGridSkeleton({
  fields,
}: {
  fields: ReadonlyArray<{ label: string; value: string }>
}) {
  return (
    <div className="modal-details-grid modal-facilities-grid station-details-field-grid-skeleton">
      {fields.map((field) => (
        <div key={field.label} className="modal-detail-item">
          <div className="modal-detail-label-row">
            <span className="modal-detail-label">
              <TextSkeletonLine>{field.label}</TextSkeletonLine>
            </span>
          </div>
          <span className="modal-detail-value">
            <TextSkeletonLine>{field.value}</TextSkeletonLine>
          </span>
        </div>
      ))}
    </div>
  )
}

type StationDetailsFieldGridSkeletonProps = {
  rows?: number
  className?: string
}

/** Field label + value shimmer rows for details / KB loading fallbacks. */
export const StationDetailsFieldGridSkeleton: React.FC<StationDetailsFieldGridSkeletonProps> = ({
  rows = 8,
  className = '',
}) => {
  const fields = [...PLACE_FIELDS, ...OTHER_FIELDS].slice(0, rows)
  return (
    <div
      className={['modal-details-grid', 'modal-facilities-grid', 'station-details-field-grid-skeleton', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {fields.map((field) => (
        <div key={field.label} className="modal-detail-item">
          <div className="modal-detail-label-row">
            <span className="modal-detail-label">
              <TextSkeletonLine>{field.label}</TextSkeletonLine>
            </span>
          </div>
          <span className="modal-detail-value">
            <TextSkeletonLine>{field.value}</TextSkeletonLine>
          </span>
        </div>
      ))}
    </div>
  )
}

type StationDetailsMainSkeletonProps = {
  /** Show CRS / TIPLOC / NLC chip row skeleton in the Details body. */
  showCodeChips?: boolean
  /** Mark NLC chip as KB-sourced when the network uses Knowledgebase. */
  showKnowledgebase?: boolean
  /** Light-rail layouts omit some mainline-only blocks. */
  isLightRail?: boolean
  className?: string
}

/**
 * Fully populated Details-tab body skeleton — matches live section density
 * and stretches to the desktop left-nav floor height.
 */
export const StationDetailsMainSkeleton: React.FC<StationDetailsMainSkeletonProps> = ({
  showCodeChips = true,
  showKnowledgebase = false,
  isLightRail = false,
  className = '',
}) => (
  <div
    className={['station-details-main-skeleton', className].filter(Boolean).join(' ')}
    aria-busy="true"
    aria-hidden="true"
  >
    <div className="modal-section">
      <h3 className="modal-section-title station-section-title station-section-title--page-heading">
        <Skeleton
          className="station-section-title__icon station-details-main-skeleton__icon"
          style={{ width: '1em', height: '1em' }}
        />
        <span className="station-section-title__text">
          <TextSkeletonLine>Details</TextSkeletonLine>
        </span>
      </h3>

      {showCodeChips ? (
        <div className="station-details-code-chips" role="list" aria-label="Station codes">
          {CODE_CHIP_PLACEHOLDERS.map((chip) => (
            <BUTOperatorChip
              key={chip.key}
              instantAction
              colorVariant="primary"
              width="hug"
              className={[
                'station-details-code-chip',
                'station-details-main-skeleton__code-chip',
                chip.knowledgebase && showKnowledgebase
                  ? 'station-details-code-chip--kb'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              ariaLabel={`${chip.key} loading`}
            >
              <TextSkeletonLine className="station-details-main-skeleton__code-chip-text">
                {chip.text}
              </TextSkeletonLine>
            </BUTOperatorChip>
          ))}
        </div>
      ) : null}

      <div className="station-details-subsection">
        <h4 className="station-details-subsection__title">
          <TextSkeletonLine>Place</TextSkeletonLine>
        </h4>
        <FieldGridSkeleton fields={PLACE_FIELDS} />
      </div>

      {!isLightRail ? (
        <div className="station-details-subsection">
          <h4 className="station-details-subsection__title">
            <TextSkeletonLine>Other</TextSkeletonLine>
          </h4>
          <div className="station-toc-detail__chips station-details-main-skeleton__toc-chips">
            <TextSkeletonLine className="station-details-main-skeleton__toc-label">
              Station Managed by:
            </TextSkeletonLine>
            {TOC_CHIP_PLACEHOLDERS.map((name) => (
              <BUTOperatorChip
                key={name}
                instantAction
                colorVariant="primary"
                width="hug"
                className="station-details-main-skeleton__code-chip"
                ariaLabel={`${name} loading`}
              >
                <TextSkeletonLine>{name}</TextSkeletonLine>
              </BUTOperatorChip>
            ))}
          </div>
          <FieldGridSkeleton fields={OTHER_FIELDS} />
        </div>
      ) : (
        <div className="station-details-subsection">
          <h4 className="station-details-subsection__title">
            <TextSkeletonLine>Service</TextSkeletonLine>
          </h4>
          <FieldGridSkeleton
            fields={[
              { label: 'Lines served', value: 'Blue Line' },
              { label: 'Platforms', value: '2' },
              { label: 'Gauge', value: 'Standard' },
              { label: 'Step free', value: 'Yes' },
            ]}
          />
        </div>
      )}

      <div className="station-details-subsection station-details-subsection--station-url">
        <h4 className="station-details-subsection__title">
          <TextSkeletonLine>Station information</TextSkeletonLine>
        </h4>
        <BUTWideButton
          type="button"
          width="hug"
          className="modal-map-link station-details-main-skeleton__info-button"
          disabled
        >
          <TextSkeletonLine>View Station Information</TextSkeletonLine>
        </BUTWideButton>
      </div>

      <div className="station-details-main-skeleton__source-hints">
        {SOURCE_HINT_LINES.map((line) => (
          <p key={line} className="edit-hint kb-source-hint">
            <TextSkeletonLine>{line}</TextSkeletonLine>
          </p>
        ))}
      </div>
    </div>

    {showKnowledgebase ? (
      <div className="modal-section">
        <h3 className="modal-section-title station-section-title">
          <Skeleton
            className="station-section-title__icon station-details-main-skeleton__icon"
            style={{ width: '1em', height: '1em' }}
          />
          <span className="station-section-title__text">
            <TextSkeletonLine>Facilities & Staffing</TextSkeletonLine>
          </span>
        </h3>
        <div className="station-details-subsection">
          <h4 className="station-details-subsection__title">
            <TextSkeletonLine>Staffing</TextSkeletonLine>
          </h4>
          <FieldGridSkeleton
            fields={[
              { label: 'Staffing level', value: 'Full Time' },
              { label: 'Ticket office', value: 'Yes' },
              { label: 'Opening hours', value: 'Mon-Sun 06:00-22:00' },
              { label: 'Customer help', value: 'Available' },
            ]}
          />
        </div>
        <div className="station-details-subsection">
          <h4 className="station-details-subsection__title">
            <TextSkeletonLine>Facilities</TextSkeletonLine>
          </h4>
          <FieldGridSkeleton
            fields={[
              { label: 'Toilets', value: 'Yes' },
              { label: 'Waiting room', value: 'Yes' },
              { label: 'Seating', value: 'Available' },
              { label: 'WiFi', value: 'Yes' },
              { label: 'ATM', value: 'No' },
              { label: 'Refreshments', value: 'Yes' },
            ]}
          />
        </div>
      </div>
    ) : null}
  </div>
)

/** @deprecated Prefer `StationDetailsMainSkeleton` inside the live layout shell. */
const StationDetailsSkeleton: React.FC<StationDetailsMainSkeletonProps> = (props) => (
  <StationDetailsMainSkeleton {...props} />
)

/** Title shimmer for PageTopHeader while the route is still resolving. */
export const StationDetailsHeaderSkeleton: React.FC = () => (
  <TextSkeletonLine className="station-details-text-skeleton--title">Station Name</TextSkeletonLine>
)

export const StationDetailsHeaderSubtitleSkeleton: React.FC = () => (
  <TextSkeletonLine className="station-details-text-skeleton--subtitle">
    County, Region, Country
  </TextSkeletonLine>
)

export const StationDetailsHeaderEyebrowSkeleton: React.FC = () => (
  <span className="station-details-header-managed-by" aria-hidden="true">
    <TextSkeletonLine className="station-details-text-skeleton--eyebrow">
      Station Managed by:
    </TextSkeletonLine>
    <span className="station-details-header-managed-by__toc">
      <TextSkeletonLine className="station-details-text-skeleton--eyebrow">
        Operator Name (XX)
      </TextSkeletonLine>
    </span>
  </span>
)

/** Build skeleton nav tabs: current Firebase section tabs + expected KB placeholders. */
export function buildStationDetailsSkeletonTabs(
  firebaseTabs: StationDetailsSectionTab[],
  showKnowledgebase: boolean
): StationDetailsSectionTab[] {
  const tabs = firebaseTabs.filter((tab) => !tab.knowledgebase)
  if (!showKnowledgebase) return tabs
  return [
    ...tabs,
    ...KNOWLEDGEBASE_SIDEBAR_SECTION_PLACEHOLDERS.map((section) => ({
      id: toKnowledgebaseTabId(section.key),
      label: section.label,
      knowledgebase: true,
      sectionKey: section.key,
      subheaders: [] as string[],
    })),
  ]
}

export default StationDetailsSkeleton
