import type { Station } from '../types'
import { parseStoredDateForSort } from './dateDdMmYyyy'

const getOrderOfOpeningNumber = (station: Station): number | null => {
  if (station.orderOfOpening == null) return null
  const trimmed = String(station.orderOfOpening).trim()
  if (trimmed === '') return null
  const order = Number(trimmed)
  return Number.isFinite(order) ? order : null
}

const getStationOpenedTimestamp = (station: Station): number | null => {
  if (!station.dateOpened?.trim()) return null
  return parseStoredDateForSort(station.dateOpened)
}

/**
 * Oldest→newest by Date Opened, then Order of Opening within that date (1, 2, 3…),
 * then name. Newest→oldest reverses both (later dates first; within a date 8, 7, 6…).
 * Undated stops sort last in both directions.
 */
export function compareStationsByDateOpened(
  a: Station,
  b: Station,
  direction: 'asc' | 'desc'
): number {
  const sign = direction === 'asc' ? 1 : -1
  const aMs = getStationOpenedTimestamp(a)
  const bMs = getStationOpenedTimestamp(b)

  if (aMs == null && bMs == null) {
    // fall through to order / name
  } else if (aMs == null) {
    return 1
  } else if (bMs == null) {
    return -1
  } else if (aMs !== bMs) {
    return (aMs - bMs) * sign
  }

  const aOrder = getOrderOfOpeningNumber(a)
  const bOrder = getOrderOfOpeningNumber(b)
  if (aOrder != null && bOrder != null && aOrder !== bOrder) {
    return (aOrder - bOrder) * sign
  }
  if (aOrder != null && bOrder == null) return -1
  if (aOrder == null && bOrder != null) return 1

  return (a.stationName || '').localeCompare(b.stationName || '')
}
