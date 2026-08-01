import type { Station } from '../types'
import { parseStoredDateForSort, storedDateToIsoDate } from './dateDdMmYyyy'

/** Timeline position: opening date first, then order of opening within that date. */
export type SuperTramTimelineCutoff = {
  dateMs: number
  order: number | null
}

export type SuperTramTimelineStep = {
  cutoff: SuperTramTimelineCutoff
  /** Opening date for the step label / datetime attribute. */
  dateMs: number
  label: string
}

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
  return { dateMs, order: getStationOrderOfOpening(station) }
}

/** Stops with no order value open last within their date. */
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
  return compareOrders(a.order, b.order)
}

/**
 * Derive a shared order-of-opening value from a stored opening date (dd/mm/yyyy).
 * Stops that opened on the same day get the same value (YYYYMMDD), so they open together
 * until an editor gives them distinct orders.
 */
export function orderOfOpeningFromDateOpened(dateOpened: string | null | undefined): string {
  const trimmed = String(dateOpened ?? '').trim()
  if (!trimmed) return ''
  const iso = storedDateToIsoDate(trimmed)
  if (!iso) return ''
  return iso.replace(/-/g, '')
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Empty lead-in step: the calendar day before the first opening, so play starts with no pins. */
export function buildTimelinePrologueStep(firstOpeningDateMs: number): SuperTramTimelineStep {
  const dateMs = firstOpeningDateMs - MS_PER_DAY
  return {
    cutoff: { dateMs, order: null },
    dateMs,
    label: formatTimelineDate(dateMs),
  }
}

export function buildSuperTramTimelineSteps(stations: Station[]): SuperTramTimelineStep[] {
  const cutoffsByKey = new Map<string, SuperTramTimelineCutoff>()

  for (const station of stations) {
    const cutoff = getStationTimelineCutoff(station)
    if (cutoff == null) continue
    cutoffsByKey.set(`${cutoff.dateMs}:${cutoff.order ?? ''}`, cutoff)
  }

  const openingSteps = [...cutoffsByKey.values()].sort(compareTimelineCutoffs).map((cutoff) => ({
    cutoff,
    dateMs: cutoff.dateMs,
    label: formatTimelineDate(cutoff.dateMs),
  }))

  if (openingSteps.length === 0) return []

  return [buildTimelinePrologueStep(openingSteps[0].dateMs), ...openingSteps]
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
