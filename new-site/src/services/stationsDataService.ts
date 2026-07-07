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
import { fetchLocalStations } from '@/services/localData'
import {
  isIndexedDbEntryFresh,
  readStationsFromIndexedDb,
  writeStationsToIndexedDb,
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
  detailLevel: StationFetchDetailLevel
): Promise<Station[]> {
  return fetchWithDevTimeout(fetchStationsFromFirebase(collectionId, { detailLevel }))
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
  detailLevel: StationFetchDetailLevel
): Promise<void> {
  const fetchedAt = Date.now()
  if (detailLevel === 'full') {
    await writeStationsToIndexedDb(collectionId, stations, fetchedAt)
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
    await writeStationsToIndexedDb(collectionId, stations, fetchedAt)
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

    if (
      !force &&
      detailLevel === 'lean' &&
      (hasFullData || hasListData) &&
      state.fetchedAt != null &&
      isIndexedDbEntryFresh({
        collectionId,
        stations: state.full.length > 0 ? state.full : state.list,
        fetchedAt: state.fetchedAt,
        version: 1,
      })
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
      isIndexedDbEntryFresh({
        collectionId,
        stations: state.full,
        fetchedAt: state.fetchedAt,
        version: 1,
      })
    ) {
      patchState(collectionId, { list: state.full })
      return
    }

    if (
      !force &&
      hasTargetData &&
      state.fetchedAt != null &&
      isIndexedDbEntryFresh({
        collectionId,
        stations: state.full.length > 0 ? state.full : state.list.length > 0 ? state.list : state.lean,
        fetchedAt: state.fetchedAt,
        version: 1,
      })
    ) {
      return
    }

    const hadData = hasTargetData || hasFullData || hasListData
  const isRefreshing = hadData && !force

    if (!hadData) {
      patchState(collectionId, { loading: true, error: null })
    } else {
      patchState(collectionId, { refreshing: true, error: null })
    }

    if (preferCache && !hadData) {
      const hydrated = await hydrateFromIndexedDb(collectionId)
      if (hydrated) {
        patchState(collectionId, { loading: false })
        const entry = await readStationsFromIndexedDb(collectionId)
        const stale = !isIndexedDbEntryFresh(entry)
        if (!stale && !force) {
          return
        }
        patchState(collectionId, { refreshing: true })
      }
    }

    try {
      const stations = await fetchCollectionFromNetwork(collectionId, detailLevel)
      if (stations.length === 0) {
        throw new Error(`No data available in Firebase for ${collectionId}`)
      }
      await persistCollection(collectionId, stations, detailLevel)
    } catch (err) {
      if (!hadData) {
        patchState(collectionId, {
          error: `Unable to fetch station data from Firebase. (${getErrorMessage(err)})`,
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
