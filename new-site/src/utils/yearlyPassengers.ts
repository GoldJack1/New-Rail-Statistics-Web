import type { Station, YearlyPassengers } from '../types'
import { DEFAULT_NETWORK_COLLECTION_ID } from '../constants/stationCollections'

export function parseYearlyPassengerCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/,/g, '')
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function extractYearlyPassengersFromFirestoreData(
  data: Record<string, unknown>
): YearlyPassengers | null {
  const nested = data.yearlyPassengers
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const result: YearlyPassengers = {}
    let hasValue = false

    for (const [year, value] of Object.entries(nested as Record<string, unknown>)) {
      if (!/^\d{4}$/.test(year)) continue
      const count = parseYearlyPassengerCount(value)
      if (count != null) {
        result[year] = count
        hasValue = true
      } else if (value === null) {
        result[year] = null
      }
    }

    if (hasValue) return result
  }

  const fromTopLevel: YearlyPassengers = {}
  let hasTopLevel = false

  for (const [key, value] of Object.entries(data)) {
    if (!/^\d{4}$/.test(key)) continue
    const count = parseYearlyPassengerCount(value)
    if (count != null) {
      fromTopLevel[key] = count
      hasTopLevel = true
    } else if (value === null) {
      fromTopLevel[key] = null
    }
  }

  return hasTopLevel ? fromTopLevel : null
}

export function getLatestYearlyPassengerEntry(
  passengers: Station['yearlyPassengers'] | YearlyPassengers | number | string | null | undefined
): { year: string; count: number } | null {
  if (passengers == null) return null

  if (typeof passengers === 'number' || typeof passengers === 'string') {
    const count = parseYearlyPassengerCount(passengers)
    return count != null ? { year: '', count } : null
  }

  if (typeof passengers !== 'object' || Array.isArray(passengers)) return null

  return (
    Object.keys(passengers)
      .filter((year) => /^\d{4}$/.test(year))
      .map((year) => ({
        year,
        count: parseYearlyPassengerCount(passengers[year]),
      }))
      .filter((entry): entry is { year: string; count: number } => entry.count != null)
      .sort((a, b) => parseInt(b.year, 10) - parseInt(a.year, 10))[0] ?? null
  )
}

export function getLatestYearlyPassengerCount(
  passengers: Station['yearlyPassengers'] | YearlyPassengers | number | string | null | undefined
): number | null {
  return getLatestYearlyPassengerEntry(passengers)?.count ?? null
}

/** Passenger count used for sorting — only GB National Rail stations have real values. */
export function getPassengersForSort(station: Station): number {
  if (station.sourceCollectionId !== DEFAULT_NETWORK_COLLECTION_ID) return 0
  return getLatestYearlyPassengerCount(station.yearlyPassengers) ?? 0
}

export function getLatestYearlyPassengerDisplay(
  passengers: Station['yearlyPassengers'] | YearlyPassengers | number | string | null | undefined
): string {
  const entry = getLatestYearlyPassengerEntry(passengers)
  if (!entry) return ''

  const formattedCount = entry.count.toLocaleString()
  return entry.year ? `(${entry.year}) ${formattedCount}` : formattedCount
}

export type YearlyPassengerChartPoint = {
  year: string
  value: number
}

/** Numeric year→count points sorted ascending, for charts. Skips null/blank years. */
export function getYearlyPassengerChartPoints(
  passengers: Station['yearlyPassengers'] | YearlyPassengers | number | string | null | undefined
): YearlyPassengerChartPoint[] {
  if (passengers == null) return []

  if (typeof passengers === 'number' || typeof passengers === 'string') {
    const count = parseYearlyPassengerCount(passengers)
    return count != null ? [{ year: 'Total', value: count }] : []
  }

  if (typeof passengers !== 'object' || Array.isArray(passengers)) return []

  return Object.keys(passengers)
    .filter((year) => /^\d{4}$/.test(year))
    .map((year) => ({
      year,
      value: parseYearlyPassengerCount(passengers[year]),
    }))
    .filter((entry): entry is YearlyPassengerChartPoint => entry.value != null)
    .sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10))
}

/**
 * Drop long runs of leading/trailing zeros on a chart series, but keep the
 * zero immediately before the first non-zero (and after the last) so the line
 * can rise from / return to the axis. All-zero series become empty.
 */
export function trimLeadingTrailingChartZeros(
  points: YearlyPassengerChartPoint[]
): YearlyPassengerChartPoint[] {
  if (points.length === 0) return points

  let firstNonZero = -1
  let lastNonZero = -1
  for (let i = 0; i < points.length; i += 1) {
    if (points[i].value !== 0) {
      if (firstNonZero < 0) firstNonZero = i
      lastNonZero = i
    }
  }

  if (firstNonZero < 0) return []

  const start =
    firstNonZero > 0 && points[firstNonZero - 1].value === 0 ? firstNonZero - 1 : firstNonZero
  const end =
    lastNonZero < points.length - 1 && points[lastNonZero + 1].value === 0
      ? lastNonZero + 1
      : lastNonZero

  return points.slice(start, end + 1)
}

/** Compact axis label: 0, 500, 3K, 1.2M */
export function formatPassengerAxisTick(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000
    const rounded = Math.abs(millions) >= 10 || Number.isInteger(millions)
      ? millions.toFixed(0)
      : millions.toFixed(1)
    return `${rounded}M`
  }
  if (abs >= 1000) {
    const thousands = value / 1000
    const rounded = Math.abs(thousands) >= 10 || Number.isInteger(thousands)
      ? thousands.toFixed(0)
      : thousands.toFixed(1)
    return `${rounded}K`
  }
  return String(Math.round(value))
}
