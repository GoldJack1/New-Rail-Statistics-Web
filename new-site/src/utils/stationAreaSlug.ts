/**
 * Station detail URL paths: {networkSlug}/{stationSlug}
 * e.g. gb-heritage/keighley, gb-national-rail/london-paddington
 */

import {
  DEFAULT_NETWORK_COLLECTION_ID,
  getCollectionIdFromShortUrlCode,
  isStationCollectionId,
  NETWORK_URL_SLUGS,
  SANDBOX_URL_SLUG,
  STNAREA_TO_NETWORK_COLLECTION,
  isSandboxCollection,
  type NetworkCollectionId,
  type StationCollectionId,
} from '../constants/stationCollections'
import type { Station } from '../types'

export function slugifyStationPathSegment(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getNetworkUrlSlug(collectionId: StationCollectionId): string {
  if (isSandboxCollection(collectionId)) return SANDBOX_URL_SLUG
  return NETWORK_URL_SLUGS[collectionId]
}

export function getCollectionIdFromNetworkUrlSlug(slug: string): StationCollectionId | null {
  const normalized = slug.trim().toLowerCase()
  if (normalized === SANDBOX_URL_SLUG) return 'newsandboxstations1'
  for (const id of Object.keys(NETWORK_URL_SLUGS) as NetworkCollectionId[]) {
    if (NETWORK_URL_SLUGS[id] === normalized) return id
  }
  return null
}

export function getStationNetworkCollectionId(
  station: Station,
  fallbackCollectionId?: StationCollectionId
): StationCollectionId | null {
  if (station.sourceCollectionId && isStationCollectionId(station.sourceCollectionId)) {
    return station.sourceCollectionId
  }
  if (fallbackCollectionId && isStationCollectionId(fallbackCollectionId)) {
    return fallbackCollectionId
  }
  const stnarea = station.stnarea?.trim().toUpperCase()
  if (stnarea && STNAREA_TO_NETWORK_COLLECTION[stnarea]) {
    return STNAREA_TO_NETWORK_COLLECTION[stnarea]
  }
  return null
}

/** Unique key for a station across merged network collections (Firestore doc IDs overlap). */
export function getStationMapKey(station: Station): string {
  const collectionId = getStationNetworkCollectionId(station)
  return collectionId ? `${collectionId}:${station.id}` : station.id
}

/** URL path segment: slugified station name, or Firestore `urlSlug` when set. */
export function getStationPathSlug(station: Pick<Station, 'stationName' | 'urlSlug'>): string {
  const urlSlug = station.urlSlug?.trim()
  if (urlSlug) return slugifyStationPathSegment(urlSlug)
  return slugifyStationPathSegment(station.stationName || '')
}

/**
 * Build station detail path segment: {networkSlug}/{stationSlug}
 * e.g. gb-heritage/keighley
 */
export function buildStationPath(
  station: Station,
  fallbackCollectionId?: StationCollectionId
): string {
  const collectionId =
    getStationNetworkCollectionId(station, fallbackCollectionId) ??
    (fallbackCollectionId && isStationCollectionId(fallbackCollectionId)
      ? fallbackCollectionId
      : DEFAULT_NETWORK_COLLECTION_ID)
  const networkSlug = getNetworkUrlSlug(collectionId)
  const stationSlug = getStationPathSlug(station)
  return `${networkSlug}/${stationSlug}`
}

export function findStationByRoute(
  stations: Station[],
  networkSlug: string,
  stationSlug: string,
  fallbackCollectionId?: StationCollectionId
): Station | null {
  const collectionId = getCollectionIdFromNetworkUrlSlug(networkSlug)
  if (!collectionId) return null
  const normalizedStationSlug = slugifyStationPathSegment(decodeURIComponent(stationSlug))

  return (
    stations.find((station) => {
      const stationCollection = getStationNetworkCollectionId(station, fallbackCollectionId)
      if (stationCollection !== collectionId) return false
      return getStationPathSlug(station) === normalizedStationSlug
    }) ?? null
  )
}

/**
 * Parse a short-code station path segment: `{shortCode}-{stationId}`
 * e.g. gbnr-1566 → GB National Rail + id 1566
 *
 * Long-category and id-only legacy formats are no longer supported.
 */
export function parseShortNetworkStationPath(
  pathSegment: string
): { collectionId: NetworkCollectionId; stationId: string } | null {
  if (!pathSegment || pathSegment === 'new') return null
  const normalized = pathSegment.trim().toLowerCase()
  // Never treat a full network URL slug as a short-id path.
  if (getCollectionIdFromNetworkUrlSlug(normalized)) return null

  const dash = normalized.indexOf('-')
  if (dash <= 0 || dash === normalized.length - 1) return null

  const shortCode = normalized.slice(0, dash)
  const stationId = pathSegment.trim().slice(dash + 1)
  if (!stationId) return null

  const collectionId = getCollectionIdFromShortUrlCode(shortCode)
  if (!collectionId) return null

  return { collectionId, stationId }
}

/**
 * Match a station id within a network, allowing zero-padded variants
 * (e.g. URL `1566` matches stored id `1566` or `01566`).
 */
export function stationIdsMatch(a: string, b: string): boolean {
  if (a === b) return true
  const aTrim = a.replace(/^0+/, '') || '0'
  const bTrim = b.replace(/^0+/, '') || '0'
  return aTrim === bTrim
}

export function findStationByShortNetworkPath(
  stations: Station[],
  pathSegment: string,
  fallbackCollectionId?: StationCollectionId
): Station | null {
  const parsed = parseShortNetworkStationPath(pathSegment)
  if (!parsed) return null

  return (
    stations.find((station) => {
      const stationCollection = getStationNetworkCollectionId(station, fallbackCollectionId)
      if (stationCollection !== parsed.collectionId) return false
      return stationIdsMatch(String(station.id), parsed.stationId)
    }) ?? null
  )
}

/** @deprecated Use parseShortNetworkStationPath — long-category / id-only legacy URLs are removed. */
export function parseLegacyStationPath(pathSegment: string): string {
  const parsed = parseShortNetworkStationPath(pathSegment)
  return parsed ? parsed.stationId : pathSegment
}

/** @deprecated Use parseShortNetworkStationPath */
export function parseStationPath(pathSegment: string): string {
  return parseLegacyStationPath(pathSegment)
}
