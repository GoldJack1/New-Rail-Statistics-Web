import type { Station } from '../types'
import { parseStoredDateForSort, storedDateToIsoDate } from './dateDdMmYyyy'

/**
 * Timeline position: order of opening first, then date, then station id.
 * Stops without an order open after all ordered stops (by date).
 */
export type SuperTramTimelineCutoff = {
  dateMs: number
  order: number | null
  /** Stable per-stop tie-break; null only for the empty prologue step. */
  stationId: string | null
}

export type SuperTramTimelineStep = {
  cutoff: SuperTramTimelineCutoff
  /** Opening date for the step label / datetime attribute. */
  dateMs: number
  label: string
}

/** Sorts before every real stop so the playhead can start with an empty map. */
const TIMELINE_PROLOGUE_ORDER = Number.NEGATIVE_INFINITY

export function getStationOpenedTimestamp(station: Station): number | null {
  if (!station.dateOpened?.trim()) return null
  return parseStoredDateForSort(station.dateOpened)
}

export function getStationOrderOfOpening(station: Station): number | null {
  if (station.orderOfOpening == null) return null
  const trimmed = String(station.orderOfOpening).trim()
  if (trimmed === '') return null
  const order = Number(trimmed)
  return Number.isFinite(order) ? order : null
}

export function getStationTimelineCutoff(station: Station): SuperTramTimelineCutoff | null {
  const dateMs = getStationOpenedTimestamp(station)
  if (dateMs == null) return null
  return {
    dateMs,
    order: getStationOrderOfOpening(station),
    stationId: station.id,
  }
}

/** Stops with no order value open after every stop that has one. */
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
  const orderCmp = compareOrders(a.order, b.order)
  if (orderCmp !== 0) return orderCmp
  if (a.dateMs !== b.dateMs) return a.dateMs - b.dateMs
  return (a.stationId ?? '').localeCompare(b.stationId ?? '')
}

/**
 * Derive a default order-of-opening value from a stored opening date (dd/mm/yyyy).
 * Prefer a network sequence (1, 2, 3…) when editing — that drives the slider order.
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
    cutoff: { dateMs, order: TIMELINE_PROLOGUE_ORDER, stationId: null },
    dateMs,
    label: formatTimelineDate(dateMs),
  }
}

/** One slider step per dated stop, ordered by order of opening → date → station id. */
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

export function countStationsVisibleAtTimelineCutoff(
  stations: Station[],
  cutoff: SuperTramTimelineCutoff | null,
  showUndatedAtMax: boolean
): number {
  return stations.filter((station) =>
    isStationVisibleAtTimelineCutoff(station, cutoff, showUndatedAtMax)
  ).length
}
