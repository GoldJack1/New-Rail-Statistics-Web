import type { Station } from '../types'
import { LIGHTRAIL_COLLECTION_ID } from './lightRailStationFields'

/** TOC label used for SuperTram stops in table / filters (stops have no Firestore TOC). */
export const SUPERTRAM_TOC_LABEL = 'SYSupertram'

export function isLightRailStop(station: Pick<Station, 'sourceCollectionId' | 'stnarea'>): boolean {
  if (station.sourceCollectionId === LIGHTRAIL_COLLECTION_ID) return true
  return station.stnarea?.trim().toUpperCase() === 'GBSHEFFSUPERTRAM'
}

/** Display / filter TOC for a station (SuperTram → SYSupertram). */
export function getStationTocForDisplay(
  station: Pick<Station, 'sourceCollectionId' | 'stnarea' | 'toc'>
): string {
  if (isLightRailStop(station)) return SUPERTRAM_TOC_LABEL
  return (station.toc ?? '').trim()
}

/** Unique TOC chip labels from stations (comma-split, sorted). */
export function collectUniqueStationTocNames(
  stations: ReadonlyArray<Pick<Station, 'sourceCollectionId' | 'stnarea' | 'toc'>>
): string[] {
  const tocs = new Set<string>()
  for (const station of stations) {
    const raw = getStationTocForDisplay(station)
    if (!raw) continue
    for (const part of raw.split(',')) {
      const trimmed = part.trim()
      if (trimmed) tocs.add(trimmed)
    }
  }
  return [...tocs].sort((a, b) => a.localeCompare(b))
}
