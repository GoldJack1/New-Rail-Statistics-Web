import type { Station } from '../types'
import { isLightRailStop } from './stationCardForNetwork'
import { formatStationLocationDisplay, type StationLocaleParts } from './formatStationLocation'

const SUPERTRAM_TOC_LABEL = 'SY Supertram'

export function getStationDetailsHeaderToc(
  station: Pick<Station, 'toc' | 'sourceCollectionId' | 'stnarea'>
): string {
  if (isLightRailStop(station)) return SUPERTRAM_TOC_LABEL
  return (station.toc ?? '').trim()
}

/** Locale line under the station name (TOC / managed-by is shown separately above the title). */
export function formatStationDetailsHeaderSubtitle(
  station: StationLocaleParts & Pick<Station, 'toc' | 'sourceCollectionId' | 'stnarea'>,
  options?: { pendingSuffix?: string | null }
): string {
  const locale = formatStationLocationDisplay(station)
  const pending = (options?.pendingSuffix ?? '').trim()
  if (!pending) return locale
  if (!locale) return pending
  return `${locale} · ${pending}`
}

/** National-rail header eyebrow: “Station Managed by: Name (CODE)”. */
export function formatStationDetailsHeaderManagedBy(
  displayName: string,
  tocCode?: string | null
): string {
  const toc = formatStationDetailsHeaderManagedByToc(displayName, tocCode)
  if (!toc) return ''
  return `Station Managed by: ${toc}`
}

/** TOC name + optional code for the header managed-by line. */
export function formatStationDetailsHeaderManagedByToc(
  displayName: string,
  tocCode?: string | null
): string {
  const name = displayName.trim()
  const code = (tocCode ?? '').trim()
  if (name && code) return `${name} (${code})`
  if (name) return name
  if (code) return `(${code})`
  return ''
}
