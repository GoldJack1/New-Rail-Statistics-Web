import {
  DEFAULT_NETWORK_COLLECTION_ID,
  NETWORK_COLLECTION_IDS,
  SANDBOX_COLLECTION_ID,
  type NetworkCollectionId,
  type NetworkViewFilter,
  type StationCollectionId,
} from '@/constants/stationCollections'
import type { StationFetchDetailLevel } from '@/services/stationFirestoreMapper'
import { fetchStationsFromFirebase } from '@/services/firebase'
import {
  fetchCollectionFromCdn,
  fetchMergedNetworkStationsFromCdn,
  fetchStationsCdnManifest,
  invalidateStationsCdnManifestCache,
  isCdnBackedCollection,
  isStationCdnEnabled,
  shouldUseFirestoreForCollection,
  splitMergedStationsByCollection,
} from '@/services/stationsCdnService'
import { fetchLocalStations } from '@/services/localData'
import {
  isIndexedDbEntryFresh,
  readStationsFromIndexedDb,
  writeManifestVersionToIndexedDb,
  writeStationsToIndexedDb,
  type StationsIndexedDbEntry,
} from '@/services/stationsIndexedDb'
import type { Station } from '@/types'
import { mergeNetworkCollections, toMapLeanStation } from '@/utils/mapLeanStation'

const FIREBASE_TIMEOUT_MS = 12_000
const SANDBOX_COLLECTION: StationCollectionId = SANDBOX_COLLECTION_ID

type CollectionLoadState = {
  full: Station[]
  list: Station[]
  lean: Station[]
  loading: boolean
  refreshing: boolean
  error: string | null
  fetchedAt: number | null
}

type Listener = () => void

const listeners = new Set<Listener>()
const collectionState = new Map<StationCollectionId, CollectionLoadState>()
const inflightLoads = new Map<string, Promise<void>>()
const inflightMergedBundleLoads = new Map<StationFetchDetailLevel, Promise<boolean>>()
let storeRevision = 0

function createEmptyState(): CollectionLoadState {
  return {
    full: [],
    list: [],
    lean: [],
    loading: false,
    refreshing: false,
    error: null,
    fetchedAt: null,
  }
}

function resolveCollectionStations(
  state: CollectionLoadState,
  detailLevel: StationFetchDetailLevel
): Station[] {
  if (detailLevel === 'full') {
    return state.full.length > 0 ? state.full : state.list.length > 0 ? state.list : state.lean
  }
  if (detailLevel === 'list') {
    return state.list.length > 0 ? state.list : state.full.length > 0 ? state.full : state.lean
  }
  return state.lean.length > 0 ? state.lean : state.list.length > 0 ? state.list : state.full
}

function getState(collectionId: StationCollectionId): CollectionLoadState {
  const existing = collectionState.get(collectionId)
  if (existing) return existing
  const next = createEmptyState()
  collectionState.set(collectionId, next)
  return next
}

function notify(): void {
  storeRevision += 1
  listeners.forEach((listener) => listener())
}

export function getStationsStoreRevision(): number {
  return storeRevision
}

function patchState(
  collectionId: StationCollectionId,
  patch: Partial<CollectionLoadState>
): void {
  const current = getState(collectionId)
  collectionState.set(collectionId, { ...current, ...patch })
  notify()
}

export function subscribeStationsData(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getFetchConcurrency(): number {
  if (typeof navigator === 'undefined') return 3
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return 1
  const cores = navigator.hardwareConcurrency ?? 4
  return cores <= 4 ? 2 : 3
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown error'
  }
}

function inflightKey(collectionId: StationCollectionId, detailLevel: StationFetchDetailLevel, force: boolean): string {
  return `${collectionId}:${detailLevel}:${force ? 'force' : 'normal'}`
}

async function fetchWithDevTimeout<T>(promise: Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== 'development') {
    return promise
  }
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Firebase request timed out')), FIREBASE_TIMEOUT_MS)
  )
  return Promise.race([promise, timeoutPromise])
}

async function fetchCollectionFromNetwork(
  collectionId: StationCollectionId,
  detailLevel: StationFetchDetailLevel,
  force: boolean
): Promise<Station[]> {
  if (!shouldUseFirestoreForCollection(collectionId, force) && isCdnBackedCollection(collectionId)) {
    try {
      return await fetchWithDevTimeout(
        fetchCollectionFromCdn(collectionId, detailLevel)
      )
    } catch (error) {
      console.warn(`CDN fetch failed for ${collectionId}, falling back to Firestore:`, error)
    }
  }

  return fetchWithDevTimeout(fetchStationsFromFirebase(collectionId, { detailLevel }))
}

async function getActiveManifestVersion(): Promise<string | null> {
  if (!isStationCdnEnabled()) return null
  const manifest = await fetchStationsCdnManifest()
  return manifest?.version ?? null
}

async function hydrateAllNetworkCollectionsFromIndexedDb(): Promise<void> {
  await Promise.all(NETWORK_COLLECTION_IDS.map((collectionId) => hydrateFromIndexedDb(collectionId)))
}

async function refreshCollectionIfStale(
  collectionId: StationCollectionId,
  detailLevel: StationFetchDetailLevel,
  entry: StationsIndexedDbEntry
): Promise<void> {
  try {
    const remoteVersion = await getActiveManifestVersion()
    const versionChanged = Boolean(
      remoteVersion && entry.manifestVersion && remoteVersion !== entry.manifestVersion
    )
    const ttlExpired = !isIndexedDbEntryFresh(entry, undefined, remoteVersion)
    if (!versionChanged && !ttlExpired) return

    const stations = await fetchCollectionFromNetwork(collectionId, detailLevel, false)
    if (stations.length === 0) return
    await persistCollection(collectionId, stations, detailLevel, remoteVersion)
  } catch (error) {
    console.warn(`Background station refresh failed for ${collectionId}:`, error)
  } finally {
    patchState(collectionId, { refreshing: false })
  }
}

async function loadMergedBundleIntoCollections(detailLevel: StationFetchDetailLevel): Promise<boolean> {
  if (!isStationCdnEnabled()) return false

  const existing = inflightMergedBundleLoads.get(detailLevel)
  if (existing) return existing

  const task = (async () => {
    try {
      const manifest = await fetchStationsCdnManifest()
      if (!manifest?.bundles.all) return false

      const merged = await fetchMergedNetworkStationsFromCdn(detailLevel, manifest)
      if (merged.length === 0) return false

      const grouped = splitMergedStationsByCollection(merged)
      const fetchedAt = Date.now()
      let loadedCollections = 0

      for (const collectionId of NETWORK_COLLECTION_IDS) {
        const stations = grouped.get(collectionId) ?? []
        if (stations.length === 0) continue
        loadedCollections += 1

        if (detailLevel === 'full') {
          patchState(collectionId, {
            full: stations,
            list: stations,
            lean: stations.map(toMapLeanStation),
            fetchedAt,
            error: null,
          })
        } else if (detailLevel === 'list') {
          patchState(collectionId, {
            list: stations,
            lean: stations.map(toMapLeanStation),
            fetchedAt,
            error: null,
          })
        } else {
          patchState(collectionId, {
            lean: stations,
            fetchedAt,
            error: null,
          })
        }
      }

      if (loadedCollections === 0) return false

      await Promise.all(
        NETWORK_COLLECTION_IDS.map(async (collectionId) => {
          const stations = grouped.get(collectionId) ?? []
          if (stations.length === 0) return
          await writeStationsToIndexedDb(collectionId, stations, fetchedAt, manifest.version)
        })
      )

      await writeManifestVersionToIndexedDb(manifest.version)
      return true
    } catch (error) {
      console.warn('Failed to load merged CDN station bundle:', error)
      return false
    }
  })()

  inflightMergedBundleLoads.set(detailLevel, task)
  try {
    return await task
  } finally {
    inflightMergedBundleLoads.delete(detailLevel)
  }
}

export function getCollectionStations(
  collectionId: StationCollectionId,
  detailLevel: StationFetchDetailLevel = 'full'
): Station[] {
  return resolveCollectionStations(getState(collectionId), detailLevel)
}

export function isCollectionLoading(collectionId: StationCollectionId): boolean {
  return getState(collectionId).loading
}

export function isCollectionRefreshing(collectionId: StationCollectionId): boolean {
  return getState(collectionId).refreshing
}

export function getCollectionError(collectionId: StationCollectionId): string | null {
  return getState(collectionId).error
}

export function getMergedNetworkStations(detailLevel: StationFetchDetailLevel = 'full'): Station[] {
  return mergeNetworkCollections(
    NETWORK_COLLECTION_IDS.map((collectionId) => ({
      collectionId,
      stations: getCollectionStations(collectionId, detailLevel),
    }))
  )
}

export function isAnyNetworkCollectionLoading(): boolean {
  return NETWORK_COLLECTION_IDS.some((id) => getState(id).loading)
}

export function isAnyNetworkCollectionRefreshing(): boolean {
  return NETWORK_COLLECTION_IDS.some((id) => getState(id).refreshing)
}

export function hasAnyNetworkStations(detailLevel: StationFetchDetailLevel = 'full'): boolean {
  return NETWORK_COLLECTION_IDS.some((id) => getCollectionStations(id, detailLevel).length > 0)
}

async function hydrateFromIndexedDb(collectionId: StationCollectionId): Promise<boolean> {
  const entry = await readStationsFromIndexedDb(collectionId)
  if (!entry || entry.stations.length === 0) return false

  patchState(collectionId, {
    full: entry.stations,
    list: entry.stations,
    lean: entry.stations.map(toMapLeanStation),
    fetchedAt: entry.fetchedAt,
    error: null,
  })
  return true
}

async function persistCollection(
  collectionId: StationCollectionId,
  stations: Station[],
  detailLevel: StationFetchDetailLevel,
  manifestVersion: string | null = null,
  fetchedAt: number = Date.now()
): Promise<void> {
  if (detailLevel === 'full') {
    await writeStationsToIndexedDb(collectionId, stations, fetchedAt, manifestVersion)
    patchState(collectionId, {
      full: stations,
      list: stations,
      lean: stations.map(toMapLeanStation),
      fetchedAt,
      error: null,
    })
    return
  }

  if (detailLevel === 'list') {
    await writeStationsToIndexedDb(collectionId, stations, fetchedAt, manifestVersion)
    patchState(collectionId, {
      list: stations,
      lean: stations.map(toMapLeanStation),
      fetchedAt,
      error: null,
    })
    return
  }

  patchState(collectionId, {
    lean: stations,
    fetchedAt,
    error: null,
  })
}

export async function ensureCollectionLoaded(
  collectionId: StationCollectionId,
  options?: {
    detailLevel?: StationFetchDetailLevel
    force?: boolean
    preferCache?: boolean
  }
): Promise<void> {
  const detailLevel = options?.detailLevel ?? 'full'
  const force = options?.force ?? false
  const preferCache = options?.preferCache ?? true
  const key = inflightKey(collectionId, detailLevel, force)

  const existing = inflightLoads.get(key)
  if (existing) {
    await existing
    return
  }

  const task = (async () => {
    const state = getState(collectionId)
    const hasTargetData = resolveCollectionStations(state, detailLevel).length > 0
    const hasFullData = state.full.length > 0
    const hasListData = state.list.length > 0
    const hadData = hasTargetData || hasFullData || hasListData

    if (preferCache && !force && !hadData) {
      const hydrated = await hydrateFromIndexedDb(collectionId)
      if (hydrated) {
        patchState(collectionId, { loading: false })
        const entry = await readStationsFromIndexedDb(collectionId)
        if (entry && isIndexedDbEntryFresh(entry, undefined, entry.manifestVersion ?? null)) {
          patchState(collectionId, { refreshing: true })
          void refreshCollectionIfStale(collectionId, detailLevel, entry)
          return
        }
        patchState(collectionId, { refreshing: true })
      }
    }

    const manifestVersion = await getActiveManifestVersion()

    if (
      !force &&
      detailLevel === 'lean' &&
      (hasFullData || hasListData) &&
      state.fetchedAt != null &&
      isIndexedDbEntryFresh(
        {
          collectionId,
          stations: state.full.length > 0 ? state.full : state.list,
          fetchedAt: state.fetchedAt,
          version: 1,
        },
        undefined,
        manifestVersion
      )
    ) {
      const source = state.full.length > 0 ? state.full : state.list
      patchState(collectionId, { lean: source.map(toMapLeanStation) })
      return
    }

    if (
      !force &&
      detailLevel === 'list' &&
      hasFullData &&
      state.fetchedAt != null &&
      isIndexedDbEntryFresh(
        {
          collectionId,
          stations: state.full,
          fetchedAt: state.fetchedAt,
          version: 1,
        },
        undefined,
        manifestVersion
      )
    ) {
      patchState(collectionId, { list: state.full })
      return
    }

    if (
      !force &&
      hasTargetData &&
      state.fetchedAt != null &&
      isIndexedDbEntryFresh(
        {
          collectionId,
          stations: state.full.length > 0 ? state.full : state.list.length > 0 ? state.list : state.lean,
          fetchedAt: state.fetchedAt,
          version: 1,
        },
        undefined,
        manifestVersion
      )
    ) {
      return
    }

    const hadDataAfterChecks = hasTargetData || hasFullData || hasListData

    if (!hadDataAfterChecks) {
      patchState(collectionId, { loading: true, error: null })
    } else if (!force) {
      patchState(collectionId, { refreshing: true, error: null })
    }

    try {
      const stations = await fetchCollectionFromNetwork(collectionId, detailLevel, force)
      if (stations.length === 0) {
        throw new Error(`No data available for ${collectionId}`)
      }
      await persistCollection(collectionId, stations, detailLevel, manifestVersion)
    } catch (err) {
      if (!hadDataAfterChecks) {
        patchState(collectionId, {
          error: `Unable to fetch station data. (${getErrorMessage(err)})`,
        })
      }
      console.error(`Failed to load stations for ${collectionId}:`, err)
    } finally {
      patchState(collectionId, { loading: false, refreshing: false })
    }
  })()

  inflightLoads.set(key, task)
  try {
    await task
  } finally {
    inflightLoads.delete(key)
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index]
      index += 1
      await worker(current)
    }
  })
  await Promise.all(runners)
}

export async function loadAllNetworkStationsProgressive(options?: {
  priorityCollectionId?: NetworkCollectionId
  detailLevel?: StationFetchDetailLevel
  force?: boolean
}): Promise<void> {
  const detailLevel = options?.detailLevel ?? 'full'
  const force = options?.force ?? false
  const priority = options?.priorityCollectionId ?? DEFAULT_NETWORK_COLLECTION_ID

  if (
    !force &&
    detailLevel === 'full' &&
    NETWORK_COLLECTION_IDS.every((id) => getCollectionStations(id, 'full').length > 0)
  ) {
    return
  }

  if (!force && isStationCdnEnabled()) {
    const loadedMerged = await loadMergedBundleIntoCollections(detailLevel)
    if (loadedMerged) return
  }

  const ordered: NetworkCollectionId[] = [
    priority,
    ...NETWORK_COLLECTION_IDS.filter((id) => id !== priority),
  ]

  await ensureCollectionLoaded(priority, { detailLevel, force })

  const remaining = ordered.slice(1)
  await runWithConcurrency(remaining, getFetchConcurrency(), async (collectionId) => {
    await ensureCollectionLoaded(collectionId, { detailLevel, force: false })
  })
}

export async function bootstrapStationsData(options: {
  isSandbox: boolean
  networkView: NetworkViewFilter
  detailLevel?: StationFetchDetailLevel
  force?: boolean
}): Promise<void> {
  const { isSandbox, networkView, detailLevel = 'list', force = false } = options

  if (process.env.NEXT_PUBLIC_USE_LOCAL_DATA_ONLY === 'true') {
    const localStations = await fetchLocalStations()
    if (localStations.length > 0) {
      patchState(DEFAULT_NETWORK_COLLECTION_ID, {
        full: localStations,
        list: localStations,
        lean: localStations.map(toMapLeanStation),
        loading: false,
        refreshing: false,
        fetchedAt: Date.now(),
        error: null,
      })
    } else {
      patchState(DEFAULT_NETWORK_COLLECTION_ID, {
        error: 'No local data. Add public/data/stations.json or set NEXT_PUBLIC_USE_LOCAL_DATA_ONLY=false.',
        loading: false,
        refreshing: false,
      })
    }
    return
  }

  if (!isSandbox && !force) {
    await hydrateAllNetworkCollectionsFromIndexedDb()
  }

  if (isSandbox) {
    await ensureCollectionLoaded(SANDBOX_COLLECTION, { detailLevel, force })
    return
  }

  if (networkView !== 'all') {
    await ensureCollectionLoaded(networkView, { detailLevel, force })
    void loadAllNetworkStationsProgressive({
      priorityCollectionId: networkView,
      detailLevel,
      force: false,
    })
    return
  }

  await loadAllNetworkStationsProgressive({
    priorityCollectionId: DEFAULT_NETWORK_COLLECTION_ID,
    detailLevel,
    force,
  })
}

export function invalidateStationsCache(): void {
  collectionState.clear()
  inflightLoads.clear()
  inflightMergedBundleLoads.clear()
  invalidateStationsCdnManifestCache()
  notify()
}

export function getSandboxStations(detailLevel: StationFetchDetailLevel = 'full'): Station[] {
  return getCollectionStations(SANDBOX_COLLECTION, detailLevel)
}

export function getFullStationById(stationId: string): Station | null {
  for (const collectionId of [...NETWORK_COLLECTION_IDS, SANDBOX_COLLECTION]) {
    const state = getState(collectionId)
    const match =
      state.full.find((station) => station.id === stationId) ??
      state.list.find((station) => station.id === stationId)
    if (match) return match
  }
  return null
}
