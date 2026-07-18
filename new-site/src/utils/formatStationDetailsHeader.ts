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

export function formatStationDetailsHeaderSubtitle(
  station: StationLocaleParts & Pick<Station, 'toc' | 'sourceCollectionId' | 'stnarea'>,
  options?: { pendingSuffix?: string | null }
): string {
  const toc = getStationDetailsHeaderToc(station)
  const locale = formatStationLocationDisplay(station)
  const base = [toc, locale].filter(Boolean).join(', ')
  const pending = (options?.pendingSuffix ?? '').trim()
  if (!pending) return base
  if (!base) return pending
  return `${base} · ${pending}`
}
