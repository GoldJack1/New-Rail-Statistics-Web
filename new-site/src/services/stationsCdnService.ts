import {
  NETWORK_COLLECTION_IDS,
  SANDBOX_COLLECTION_ID,
  type NetworkCollectionId,
  type StationCollectionId,
} from '@/constants/stationCollections'
import type { StationFetchDetailLevel } from '@/services/stationFirestoreMapper'
import type { Station } from '@/types'
import type { StationCdnBundleLevel, StationsCdnManifest } from '@/types/stationsCdn'
import { mergeNetworkCollections } from '@/utils/mapLeanStation'

const MANIFEST_STORAGE_PATH = 'station-exports/manifest.json'
const MANIFEST_SESSION_KEY = 'railstats_station_cdn_manifest'

let cachedManifest: StationsCdnManifest | null = null
let cachedManifestFetchedAt = 0
const MANIFEST_MEMORY_TTL_MS = 5 * 60 * 1000
let manifestFetchPromise: Promise<StationsCdnManifest | null> | null = null

if (typeof window !== 'undefined') {
  const sessionManifest = (() => {
    try {
      const raw = window.sessionStorage.getItem(MANIFEST_SESSION_KEY)
      if (!raw) return null
      return JSON.parse(raw) as StationsCdnManifest
    } catch {
      return null
    }
  })()
  if (sessionManifest?.version && sessionManifest.bundles) {
    cachedManifest = sessionManifest
    cachedManifestFetchedAt = Date.now()
  }
}

export function isStationCdnEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_USE_LOCAL_DATA_ONLY === 'true') return false
  if (process.env.NEXT_PUBLIC_USE_STATION_CDN === 'false') return false
  return Boolean(getStationCdnManifestUrl())
}

export function isCdnBackedCollection(collectionId: StationCollectionId): collectionId is NetworkCollectionId {
  return (NETWORK_COLLECTION_IDS as readonly string[]).includes(collectionId)
}

export function getStationCdnManifestUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_STATION_CDN_MANIFEST_URL?.trim()
  if (explicit) return explicit

  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim()
  if (!bucket) return null

  const encodedPath = encodeURIComponent(MANIFEST_STORAGE_PATH)
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`
}

export function buildStationCdnBundleUrl(path: string): string {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim()
  if (!bucket) {
    throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required to resolve CDN bundle URLs')
  }
  const encodedPath = encodeURIComponent(path)
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`
}

function readSessionManifest(): StationsCdnManifest | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(MANIFEST_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StationsCdnManifest
  } catch {
    return null
  }
}

function writeSessionManifest(manifest: StationsCdnManifest): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(MANIFEST_SESSION_KEY, JSON.stringify(manifest))
  } catch {
    // Best-effort session cache.
  }
}

export async function fetchStationsCdnManifest(options?: { force?: boolean }): Promise<StationsCdnManifest | null> {
  if (!isStationCdnEnabled()) return null

  const force = options?.force ?? false
  if (
    !force &&
    cachedManifest &&
    Date.now() - cachedManifestFetchedAt < MANIFEST_MEMORY_TTL_MS
  ) {
    return cachedManifest
  }

  if (!force && manifestFetchPromise) {
    return manifestFetchPromise
  }

  const manifestUrl = getStationCdnManifestUrl()
  if (!manifestUrl) return null

  manifestFetchPromise = (async () => {
    try {
      const response = await fetch(manifestUrl, { cache: force ? 'no-cache' : 'default' })
      if (!response.ok) {
        return readSessionManifest()
      }
      const manifest = (await response.json()) as StationsCdnManifest
      if (!manifest?.version || !manifest.bundles) {
        return readSessionManifest()
      }
      cachedManifest = manifest
      cachedManifestFetchedAt = Date.now()
      writeSessionManifest(manifest)
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'stations-manifest-updated',
          version: manifest.version,
        })
      }
      return manifest
    } catch {
      return readSessionManifest()
    } finally {
      manifestFetchPromise = null
    }
  })()

  return manifestFetchPromise
}

export function getCachedStationsCdnManifest(): StationsCdnManifest | null {
  return cachedManifest ?? readSessionManifest()
}

async function decodeJsonArrayBundle(
  response: Response,
  encoding?: 'gzip' | 'identity'
): Promise<unknown[]> {
  const contentEncoding = response.headers.get('content-encoding')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

  if (
    encoding === 'gzip' &&
    contentEncoding !== 'gzip' &&
    !contentType.includes('application/json') &&
    typeof DecompressionStream !== 'undefined'
  ) {
    const stream = response.body?.pipeThrough(new DecompressionStream('gzip'))
    if (!stream) throw new Error('Failed to decompress gzip CDN bundle')
    const decompressed = await new Response(stream).text()
    const parsed = JSON.parse(decompressed) as unknown
    if (!Array.isArray(parsed)) throw new Error('CDN bundle is not an array')
    return parsed
  }

  const parsed = (await response.json()) as unknown
  if (!Array.isArray(parsed)) throw new Error('CDN bundle is not an array')
  return parsed
}

export async function fetchJsonArrayBundleFromCdn(
  bundlePath: string,
  encoding?: 'gzip' | 'identity'
): Promise<unknown[]> {
  const url = buildStationCdnBundleUrl(bundlePath)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch CDN bundle (${response.status})`)
  }
  return decodeJsonArrayBundle(response, encoding)
}

export async function fetchStationBundleFromCdn(
  bundlePath: string,
  encoding?: 'gzip' | 'identity'
): Promise<Station[]> {
  return (await fetchJsonArrayBundleFromCdn(bundlePath, encoding)) as Station[]
}

function toCdnBundleLevel(detailLevel: StationFetchDetailLevel): StationCdnBundleLevel {
  if (detailLevel === 'full') return 'full'
  if (detailLevel === 'lean') return 'lean'
  return 'list'
}

export async function fetchCollectionFromCdn(
  collectionId: NetworkCollectionId,
  detailLevel: StationFetchDetailLevel
): Promise<Station[]> {
  const manifest = await fetchStationsCdnManifest()
  if (!manifest) {
    throw new Error('Station CDN manifest is unavailable')
  }

  const bundleLevel = toCdnBundleLevel(detailLevel)
  const bundleRef = manifest.bundles[collectionId]?.[bundleLevel]
  if (!bundleRef?.path) {
    throw new Error(`No CDN bundle for ${collectionId} (${bundleLevel})`)
  }

  return fetchStationBundleFromCdn(bundleRef.path, bundleRef.encoding)
}

export async function fetchMergedNetworkStationsFromCdn(
  detailLevel: StationFetchDetailLevel,
  manifestOverride?: StationsCdnManifest | null
): Promise<Station[]> {
  const manifest = manifestOverride ?? (await fetchStationsCdnManifest())
  if (!manifest) {
    throw new Error('Station CDN manifest is unavailable')
  }

  const bundleLevel = toCdnBundleLevel(detailLevel)
  const mergedRef = manifest.bundles.all?.[bundleLevel]
  if (mergedRef?.path) {
    return fetchStationBundleFromCdn(mergedRef.path, mergedRef.encoding)
  }

  const batches = await Promise.all(
    NETWORK_COLLECTION_IDS.map(async (collectionId) => ({
      collectionId,
      stations: await fetchCollectionFromCdn(collectionId, detailLevel),
    }))
  )

  return mergeNetworkCollections(batches)
}

export function splitMergedStationsByCollection(stations: Station[]): Map<NetworkCollectionId, Station[]> {
  const grouped = new Map<NetworkCollectionId, Station[]>(
    NETWORK_COLLECTION_IDS.map((id) => [id, []])
  )

  for (const station of stations) {
    const collectionId = station.sourceCollectionId
    if (!collectionId || !(NETWORK_COLLECTION_IDS as readonly string[]).includes(collectionId)) continue
    grouped.get(collectionId)?.push(station)
  }

  return grouped
}

export function invalidateStationsCdnManifestCache(): void {
  cachedManifest = null
  cachedManifestFetchedAt = 0
  manifestFetchPromise = null
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(MANIFEST_SESSION_KEY)
    } catch {
      // ignore
    }
  }
  void import('@/services/tocOperators')
    .then((mod) => mod.invalidateTocOperatorsCache())
    .catch(() => {
      // TOC module may be unavailable in some bundles.
    })
}

/** Fire-and-forget CDN re-export after the owner publishes pending station changes. */
export async function requestStationCdnExportAfterPublish(): Promise<void> {
  if (!isStationCdnEnabled()) return

  const firebase = await import('@/services/firebase')
  await firebase.initializeFirebase()
  const firebaseApp = firebase.getFirebaseApp()
  if (!firebaseApp) return

  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const functions = getFunctions(firebaseApp, 'us-central1')
  const exportAfterPublish = httpsCallable(functions, 'exportStationSnapshotsAfterPublish')
  await exportAfterPublish()
  invalidateStationsCdnManifestCache()
}

export function shouldUseFirestoreForCollection(
  collectionId: StationCollectionId,
  force: boolean
): boolean {
  if (force) return true
  if (collectionId === SANDBOX_COLLECTION_ID) return true
  return !isStationCdnEnabled() || !isCdnBackedCollection(collectionId)
}
