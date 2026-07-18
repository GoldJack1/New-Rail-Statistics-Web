import { collection, getDocs } from 'firebase/firestore'
import { initializeFirebase } from './firebase'
import {
  fetchJsonArrayBundleFromCdn,
  fetchStationsCdnManifest,
  getCachedStationsCdnManifest,
  isStationCdnEnabled,
} from './stationsCdnService'
import {
  TOC_OPERATORS_COLLECTION,
  isTocOperatorRecord,
  mapTocOperatorDoc,
  type TocOperator,
} from '@/utils/tocOperatorMap'

export {
  TOC_OPERATORS_COLLECTION,
  TOC_OPERATOR_FALLBACK_COLORS,
  findTocOperator,
  getContrastingTextColor,
  getTocOperatorChipColors,
  mapTocOperatorDoc,
  resolveTocOperatorDisplayName,
  type TocOperator,
} from '@/utils/tocOperatorMap'

let operatorsCache: TocOperator[] | null = null
let operatorsCacheVersion: string | null = null
let operatorsPromise: Promise<TocOperator[]> | null = null

function sortOperators(operators: TocOperator[]): TocOperator[] {
  return [...operators].sort((a, b) => a.name.localeCompare(b.name))
}

function parseTocOperatorBundle(parsed: unknown[]): TocOperator[] {
  return sortOperators(parsed.filter(isTocOperatorRecord))
}

async function fetchTocOperatorsFromCdn(): Promise<{ operators: TocOperator[]; version: string } | null> {
  if (!isStationCdnEnabled()) return null

  const manifest = await fetchStationsCdnManifest()
  const bundleRef = manifest?.references?.toc_operators
  if (!manifest?.version || !bundleRef?.path) return null

  const parsed = await fetchJsonArrayBundleFromCdn(bundleRef.path, bundleRef.encoding)
  const operators = parseTocOperatorBundle(parsed)
  if (operators.length === 0) return null
  return { operators, version: manifest.version }
}

async function fetchTocOperatorsFromFirestore(): Promise<TocOperator[]> {
  const { db } = await initializeFirebase()
  if (!db) throw new Error('Firestore is not available.')

  const snapshot = await getDocs(collection(db, TOC_OPERATORS_COLLECTION))
  return sortOperators(
    snapshot.docs
      .map((docSnap) => mapTocOperatorDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
      .filter((op): op is TocOperator => op != null)
  )
}

export function getCachedTocOperators(): TocOperator[] | null {
  return operatorsCache
}

export function invalidateTocOperatorsCache(): void {
  operatorsCache = null
  operatorsCacheVersion = null
  operatorsPromise = null
}

/**
 * Prefer station CDN `references.toc_operators` when enabled; fall back to Firestore.
 */
export async function fetchTocOperators(options?: { force?: boolean }): Promise<TocOperator[]> {
  if (!options?.force && operatorsCache) {
    if (!isStationCdnEnabled()) return operatorsCache
    const cachedManifest = getCachedStationsCdnManifest()
    if (operatorsCacheVersion && cachedManifest?.version === operatorsCacheVersion) {
      return operatorsCache
    }
  }
  if (!options?.force && operatorsPromise) return operatorsPromise

  operatorsPromise = (async () => {
    try {
      const fromCdn = await fetchTocOperatorsFromCdn()
      if (fromCdn) {
        operatorsCache = fromCdn.operators
        operatorsCacheVersion = fromCdn.version
        return fromCdn.operators
      }
    } catch (error) {
      console.warn('TOC operators CDN fetch failed; falling back to Firestore.', error)
    }

    const fromFirestore = await fetchTocOperatorsFromFirestore()
    operatorsCache = fromFirestore
    operatorsCacheVersion = null
    return fromFirestore
  })()

  try {
    return await operatorsPromise
  } finally {
    operatorsPromise = null
  }
}
