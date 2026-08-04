import type { Station } from '../types'
import { parseStoredDateForSort, storedDateToIsoDate } from './dateDdMmYyyy'

/**
 * Network opening timeline position.
 * Real stops must have both a Date Opened and an Order of Opening.
 * Incomplete stops are omitted from the step list (and only appear at the end
 * when `showIncompleteAtMax` is true).
 */
export type StationOpeningTimelineCutoff = {
  dateMs: number
  /** Same-day sequence (1, 2, 3…). Prologue uses −∞. */
  order: number
  /** Stable per-stop tie-break; null only for the empty prologue step. */
  stationId: string | null
  stationName?: string | null
}

export type StationOpeningTimelineStep = {
  cutoff: StationOpeningTimelineCutoff
  dateMs: number
  label: string
}

/** Sorts before every real stop so the playhead can start with an empty map. */
export const OPENING_TIMELINE_PROLOGUE_ORDER = Number.NEGATIVE_INFINITY

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Derive a legacy YYYYMMDD string from Date Opened.
 * Kept for detecting old auto-filled Order of Opening values — not for new edits.
 */
export function orderOfOpeningFromDateOpened(dateOpened: string | null | undefined): string {
  const trimmed = String(dateOpened ?? '').trim()
  if (!trimmed) return ''
  const iso = storedDateToIsoDate(trimmed)
  if (!iso) return ''
  return iso.replace(/-/g, '')
}

function isDateShapedOrderValue(value: number): boolean {
  if (!Number.isInteger(value)) return false
  const asString = String(Math.trunc(value))
  return asString.length === 8 && /^(19|20)\d{6}$/.test(asString)
}

/** True when the value is the auto-filled Date Opened default, not a sequence number. */
export function isLegacyDateDefaultOrderOfOpening(
  station: Pick<Station, 'dateOpened' | 'orderOfOpening'>
): boolean {
  if (station.orderOfOpening == null) return false
  const trimmed = String(station.orderOfOpening).trim()
  if (trimmed === '' || !/^\d+$/.test(trimmed)) return false
  const order = Number(trimmed)
  if (!Number.isFinite(order) || !isDateShapedOrderValue(order)) return false
  const fromDate = orderOfOpeningFromDateOpened(station.dateOpened)
  return fromDate !== '' && String(Math.trunc(order)) === fromDate
}

export function getStationOpenedTimestamp(station: Pick<Station, 'dateOpened'>): number | null {
  if (!station.dateOpened?.trim()) return null
  return parseStoredDateForSort(station.dateOpened)
}

/**
 * Real same-day sequence (1, 2, 3…). Rejects empty values and legacy YYYYMMDD
 * defaults that match Date Opened.
 */
export function getStationOrderOfOpening(
  station: Pick<Station, 'dateOpened' | 'orderOfOpening'>
): number | null {
  if (station.orderOfOpening == null) return null
  const trimmed = String(station.orderOfOpening).trim()
  if (trimmed === '' || !/^\d+$/.test(trimmed)) return null
  const order = Number(trimmed)
  if (!Number.isFinite(order)) return null
  if (isLegacyDateDefaultOrderOfOpening(station)) return null
  return order
}

/** Timeline requires both a parseable opening date and a real order of opening. */
export function isStationEligibleForOpeningTimeline(
  station: Pick<Station, 'dateOpened' | 'orderOfOpening'>
): boolean {
  return getStationOpenedTimestamp(station) != null && getStationOrderOfOpening(station) != null
}

/**
 * Cutoff for an eligible stop, or null when date and/or order of opening is missing.
 */
export function getStationOpeningTimelineCutoff(
  station: Pick<Station, 'id' | 'stationName' | 'dateOpened' | 'orderOfOpening'>
): StationOpeningTimelineCutoff | null {
  const dateMs = getStationOpenedTimestamp(station)
  const order = getStationOrderOfOpening(station)
  if (dateMs == null || order == null) return null
  return {
    dateMs,
    order,
    stationId: station.id,
    stationName: station.stationName ?? '',
  }
}

export function compareOpeningTimelineCutoffs(
  a: StationOpeningTimelineCutoff,
  b: StationOpeningTimelineCutoff
): number {
  if (a.dateMs !== b.dateMs) return a.dateMs - b.dateMs
  if (a.order !== b.order) return a.order - b.order
  const nameCmp = (a.stationName ?? '').localeCompare(b.stationName ?? '', undefined, {
    sensitivity: 'base',
  })
  if (nameCmp !== 0) return nameCmp
  return (a.stationId ?? '').localeCompare(b.stationId ?? '')
}

export function formatOpeningTimelineDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Empty lead-in step: the calendar day before the earliest opening. */
export function buildOpeningTimelinePrologueStep(
  earliestOpeningDateMs: number
): StationOpeningTimelineStep {
  const dateMs = earliestOpeningDateMs - MS_PER_DAY
  return {
    cutoff: {
      dateMs,
      order: OPENING_TIMELINE_PROLOGUE_ORDER,
      stationId: null,
      stationName: null,
    },
    dateMs,
    label: formatOpeningTimelineDate(dateMs),
  }
}

/**
 * One slider step per eligible stop (date + order of opening), ordered by
 * date → order → name → id.
 */
export function buildOpeningTimelineSteps(
  stations: Array<Pick<Station, 'id' | 'stationName' | 'dateOpened' | 'orderOfOpening'>>
): StationOpeningTimelineStep[] {
  const openingSteps = stations
    .map((station) => getStationOpeningTimelineCutoff(station))
    .filter((cutoff): cutoff is StationOpeningTimelineCutoff => cutoff != null)
    .sort(compareOpeningTimelineCutoffs)
    .map((cutoff) => ({
      cutoff,
      dateMs: cutoff.dateMs,
      label: formatOpeningTimelineDate(cutoff.dateMs),
    }))

  if (openingSteps.length === 0) return []

  const earliestDateMs = Math.min(...openingSteps.map((step) => step.dateMs))
  return [buildOpeningTimelinePrologueStep(earliestDateMs), ...openingSteps]
}

export function getOpeningTimelineVisibleStationIds(
  steps: StationOpeningTimelineStep[],
  stepIndex: number
): Set<string> {
  const visible = new Set<string>()
  if (steps.length === 0) return visible
  const maxIndex = steps.length - 1
  const clamped = Math.max(0, Math.min(stepIndex, maxIndex))
  for (let index = 0; index <= clamped; index += 1) {
    const stationId = steps[index]?.cutoff.stationId
    if (stationId) visible.add(stationId)
  }
  return visible
}

export function isStationVisibleAtOpeningTimelineCutoff(
  station: Pick<Station, 'id' | 'stationName' | 'dateOpened' | 'orderOfOpening'>,
  cutoff: StationOpeningTimelineCutoff | null,
  showIncompleteAtMax: boolean
): boolean {
  if (cutoff === null) return true
  const stationCutoff = getStationOpeningTimelineCutoff(station)
  if (stationCutoff == null) return showIncompleteAtMax
  return compareOpeningTimelineCutoffs(stationCutoff, cutoff) <= 0
}

/**
 * Prefer step-list membership when available so pin reveal order always matches
 * the slider sequence.
 */
export function isStationVisibleInOpeningTimelineStep(
  station: Pick<Station, 'id' | 'stationName' | 'dateOpened' | 'orderOfOpening'>,
  options: {
    cutoff: StationOpeningTimelineCutoff | null
    visibleStationIds: ReadonlySet<string> | null
    showIncompleteAtMax: boolean
  }
): boolean {
  const { cutoff, visibleStationIds, showIncompleteAtMax } = options
  if (cutoff === null) return true
  const stationCutoff = getStationOpeningTimelineCutoff(station)
  if (stationCutoff == null) return showIncompleteAtMax
  if (visibleStationIds) return visibleStationIds.has(station.id)
  return compareOpeningTimelineCutoffs(stationCutoff, cutoff) <= 0
}

export function countStationsVisibleAtOpeningTimelineCutoff(
  stations: Array<Pick<Station, 'id' | 'stationName' | 'dateOpened' | 'orderOfOpening'>>,
  cutoff: StationOpeningTimelineCutoff | null,
  showIncompleteAtMax: boolean
): number {
  return stations.filter((station) =>
    isStationVisibleAtOpeningTimelineCutoff(station, cutoff, showIncompleteAtMax)
  ).length
}
