import type { StationCollectionId } from '@/constants/stationCollections'
import type { Station } from '@/types'

const DB_NAME = 'rail-stats-stations'
const DB_VERSION = 2
const CACHE_VERSION = 1
const STORE_NAME = 'collections'
export const STATIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface StationsIndexedDbEntry {
  collectionId: StationCollectionId
  stations: Station[]
  fetchedAt: number
  version: number
  manifestVersion?: string | null
}

const MANIFEST_STORE_NAME = 'manifest'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'collectionId' })
      }
      if (!db.objectStoreNames.contains(MANIFEST_STORE_NAME)) {
        db.createObjectStore(MANIFEST_STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export async function readStationsFromIndexedDb(
  collectionId: StationCollectionId
): Promise<StationsIndexedDbEntry | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(collectionId)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'))
      request.onsuccess = () => {
        const entry = request.result as StationsIndexedDbEntry | undefined
        resolve(entry ?? null)
      }
      tx.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

export async function writeStationsToIndexedDb(
  collectionId: StationCollectionId,
  stations: Station[],
  fetchedAt: number = Date.now(),
  manifestVersion: string | null = null
): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const entry: StationsIndexedDbEntry = {
        collectionId,
        stations,
        fetchedAt,
        version: CACHE_VERSION,
        manifestVersion,
      }
      const request = store.put(entry)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed'))
      request.onsuccess = () => resolve()
      tx.oncomplete = () => db.close()
    })
  } catch {
    // Cache persistence is best-effort.
  }
}

export function isIndexedDbEntryFresh(
  entry: StationsIndexedDbEntry | null,
  ttlMs: number = STATIONS_CACHE_TTL_MS,
  manifestVersion: string | null = null
): boolean {
  if (!entry) return false
  if (entry.version !== CACHE_VERSION) return false
  if (manifestVersion && entry.manifestVersion && entry.manifestVersion !== manifestVersion) return false
  return Date.now() - entry.fetchedAt < ttlMs
}

export async function readManifestVersionFromIndexedDb(): Promise<string | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(MANIFEST_STORE_NAME, 'readonly')
      const store = tx.objectStore(MANIFEST_STORE_NAME)
      const request = store.get('current')
      request.onerror = () => reject(request.error ?? new Error('IndexedDB manifest read failed'))
      request.onsuccess = () => {
        const entry = request.result as { id: string; version: string } | undefined
        resolve(entry?.version ?? null)
      }
      tx.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

export async function writeManifestVersionToIndexedDb(version: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MANIFEST_STORE_NAME, 'readwrite')
      const store = tx.objectStore(MANIFEST_STORE_NAME)
      const request = store.put({ id: 'current', version })
      request.onerror = () => reject(request.error ?? new Error('IndexedDB manifest write failed'))
      request.onsuccess = () => resolve()
      tx.oncomplete = () => db.close()
    })
  } catch {
    // Best-effort.
  }
}
