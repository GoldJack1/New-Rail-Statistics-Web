import type { Station } from '../types'
import { parseStoredDateForSort } from './dateDdMmYyyy'

function formatOpenedOnDate(dateOpened: string): string | null {
  const ms = parseStoredDateForSort(dateOpened)
  if (ms == null) return null
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatOrderOfOpening(orderOfOpening: Station['orderOfOpening']): string | null {
  if (orderOfOpening == null) return null
  const trimmed = String(orderOfOpening).trim()
  return trimmed === '' ? null : trimmed
}

/** e.g. `Opened on 21 March 1994` or `Opened on 21 March 1994 (1)` when order is included. */
export function formatLightRailOpenedOnLabel(
  station: Pick<Station, 'dateOpened' | 'orderOfOpening'>,
  options: { includeOrderOfOpening?: boolean } = {}
): string | null {
  const dateLabel = station.dateOpened?.trim() ? formatOpenedOnDate(station.dateOpened) : null
  if (!dateLabel) return null

  if (!options.includeOrderOfOpening) {
    return `Opened on ${dateLabel}`
  }

  const order = formatOrderOfOpening(station.orderOfOpening)
  return order ? `Opened on ${dateLabel} (${order})` : `Opened on ${dateLabel}`
}
