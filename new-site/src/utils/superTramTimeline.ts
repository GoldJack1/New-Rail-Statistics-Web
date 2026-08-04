import type { Station } from '../types'
import { parseStoredDateForSort, storedDateToIsoDate } from './dateDdMmYyyy'

/**
 * Timeline position: date opened first, then order of opening within that date,
 * then station name. Stops without a real sequence number open after numbered
 * stops on the same date.
 */
export type SuperTramTimelineCutoff = {
  dateMs: number
  order: number | null
  /** Stable per-stop tie-break; null only for the empty prologue step. */
  stationId: string | null
  stationName?: string | null
}

export type SuperTramTimelineStep = {
  cutoff: SuperTramTimelineCutoff
  /** Opening date for the step label / datetime attribute. */
  dateMs: number
  label: string
}

/** Sorts before every real stop so the playhead can start with an empty map. */
const TIMELINE_PROLOGUE_ORDER = Number.NEGATIVE_INFINITY

/** YYYYMMDD-shaped values are date defaults, not same-day sequence numbers. */
function isDateDerivedOrderValue(value: number): boolean {
  if (!Number.isInteger(value)) return false
  const asString = String(Math.trunc(value))
  return asString.length === 8 && /^(19|20)\d{6}$/.test(asString)
}

export function getStationOpenedTimestamp(station: Station): number | null {
  if (!station.dateOpened?.trim()) return null
  return parseStoredDateForSort(station.dateOpened)
}

/**
 * Same-day sequence (1, 2, 3…). Rejects empty values and YYYYMMDD date defaults
 * from `orderOfOpeningFromDateOpened`.
 */
export function getStationOrderOfOpening(station: Station): number | null {
  if (station.orderOfOpening == null) return null
  const trimmed = String(station.orderOfOpening).trim()
  if (trimmed === '' || !/^\d+$/.test(trimmed)) return null
  const order = Number(trimmed)
  if (!Number.isFinite(order)) return null
  if (isDateDerivedOrderValue(order)) return null
  return order
}

export function getStationTimelineCutoff(station: Station): SuperTramTimelineCutoff | null {
  const dateMs = getStationOpenedTimestamp(station)
  if (dateMs == null) return null
  return {
    dateMs,
    order: getStationOrderOfOpening(station),
    stationId: station.id,
    stationName: station.stationName ?? '',
  }
}

/** Within a date, stops with no sequence number open after every stop that has one. */
function compareOrders(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a - b
}

export function compareTimelineCutoffs(
  a: SuperTramTimelineCutoff,
  b: SuperTramTimelineCutoff
): number {
  if (a.dateMs !== b.dateMs) return a.dateMs - b.dateMs
  const orderCmp = compareOrders(a.order, b.order)
  if (orderCmp !== 0) return orderCmp
  const nameCmp = (a.stationName ?? '').localeCompare(b.stationName ?? '', undefined, {
    sensitivity: 'base',
  })
  if (nameCmp !== 0) return nameCmp
  return (a.stationId ?? '').localeCompare(b.stationId ?? '')
}

/**
 * Derive a default order-of-opening value from a stored opening date (dd/mm/yyyy).
 * Prefer a same-day sequence (1, 2, 3…) when editing — that orders stops within a date.
 */
export function orderOfOpeningFromDateOpened(dateOpened: string | null | undefined): string {
  const trimmed = String(dateOpened ?? '').trim()
  if (!trimmed) return ''
  const iso = storedDateToIsoDate(trimmed)
  if (!iso) return ''
  return iso.replace(/-/g, '')
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Empty lead-in step: the calendar day before the earliest opening, so play starts with no pins. */
export function buildTimelinePrologueStep(earliestOpeningDateMs: number): SuperTramTimelineStep {
  const dateMs = earliestOpeningDateMs - MS_PER_DAY
  return {
    cutoff: { dateMs, order: TIMELINE_PROLOGUE_ORDER, stationId: null, stationName: null },
    dateMs,
    label: formatTimelineDate(dateMs),
  }
}

/** One slider step per dated stop, ordered by date → order of opening → name → id. */
export function buildSuperTramTimelineSteps(stations: Station[]): SuperTramTimelineStep[] {
  const openingSteps = stations
    .map((station) => getStationTimelineCutoff(station))
    .filter((cutoff): cutoff is SuperTramTimelineCutoff => cutoff != null)
    .sort(compareTimelineCutoffs)
    .map((cutoff) => ({
      cutoff,
      dateMs: cutoff.dateMs,
      label: formatTimelineDate(cutoff.dateMs),
    }))

  if (openingSteps.length === 0) return []

  const earliestDateMs = Math.min(...openingSteps.map((step) => step.dateMs))
  return [buildTimelinePrologueStep(earliestDateMs), ...openingSteps]
}

/**
 * Station ids that should be visible for the playhead at `stepIndex`
 * (prologue + every opening step up to and including that index).
 */
export function getTimelineVisibleStationIds(
  steps: SuperTramTimelineStep[],
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

export function formatTimelineDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function isStationVisibleAtTimelineCutoff(
  station: Station,
  cutoff: SuperTramTimelineCutoff | null,
  showUndatedAtMax: boolean
): boolean {
  if (cutoff === null) return true
  const stationCutoff = getStationTimelineCutoff(station)
  if (stationCutoff == null) return showUndatedAtMax
  return compareTimelineCutoffs(stationCutoff, cutoff) <= 0
}

/**
 * Prefer step-list membership when available so pin reveal order always matches
 * the slider sequence (avoids re-compare drift).
 */
export function isStationVisibleInTimelineStep(
  station: Station,
  options: {
    cutoff: SuperTramTimelineCutoff | null
    visibleStationIds: ReadonlySet<string> | null
    showUndatedAtMax: boolean
  }
): boolean {
  const { cutoff, visibleStationIds, showUndatedAtMax } = options
  if (cutoff === null) return true
  const stationCutoff = getStationTimelineCutoff(station)
  if (stationCutoff == null) return showUndatedAtMax
  if (visibleStationIds) return visibleStationIds.has(station.id)
  return compareTimelineCutoffs(stationCutoff, cutoff) <= 0
}

export function countStationsVisibleAtTimelineCutoff(
  stations: Station[],
  cutoff: SuperTramTimelineCutoff | null,
  showUndatedAtMax: boolean
): number {
  return stations.filter((station) =>
    isStationVisibleAtTimelineCutoff(station, cutoff, showUndatedAtMax)
  ).length
}
