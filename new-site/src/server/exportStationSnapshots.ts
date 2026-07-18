import { gzipSync } from 'node:zlib'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { NETWORK_COLLECTION_IDS } from '@/constants/stationCollections'
import {
  mapFirestoreDocsToStations,
  type StationFetchDetailLevel,
} from '@/services/stationFirestoreMapper'
import type { StationsCdnManifest } from '@/types/stationsCdn'
import { mergeNetworkCollections } from '@/utils/mapLeanStation'
import {
  TOC_OPERATORS_COLLECTION,
  mapTocOperatorDoc,
  type TocOperator,
} from '@/utils/tocOperatorMap'

const EXPORT_PREFIX = 'station-exports'
const DETAIL_LEVELS: StationFetchDetailLevel[] = ['list', 'full', 'lean']

async function uploadGzipJsonArray(
  bucket: ReturnType<ReturnType<typeof getStorage>['bucket']>,
  objectPath: string,
  items: unknown[],
  countField: 'stationCount' | 'itemCount' = 'stationCount'
) {
  const gzip = gzipSync(Buffer.from(JSON.stringify(items), 'utf8'))
  await bucket.file(objectPath).save(gzip, {
    metadata: {
      contentType: 'application/json',
      contentEncoding: 'gzip',
      cacheControl: 'public, max-age=300',
    },
  })
  return {
    path: objectPath,
    encoding: 'gzip' as const,
    byteLength: gzip.byteLength,
    [countField]: items.length,
  }
}

export async function exportStationSnapshotsToStorage(): Promise<StationsCdnManifest> {
  const db = getFirestore()
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim()
  const bucket = bucketName ? getStorage().bucket(bucketName) : getStorage().bucket()
  const version = new Date().toISOString()

  const manifest: StationsCdnManifest = {
    version,
    generatedAt: version,
    bundles: {},
    references: {},
  }

  const listBatches: Array<{
    collectionId: (typeof NETWORK_COLLECTION_IDS)[number]
    stations: ReturnType<typeof mapFirestoreDocsToStations>
  }> = []
  const fullBatches: Array<{
    collectionId: (typeof NETWORK_COLLECTION_IDS)[number]
    stations: ReturnType<typeof mapFirestoreDocsToStations>
  }> = []
  const leanBatches: Array<{
    collectionId: (typeof NETWORK_COLLECTION_IDS)[number]
    stations: ReturnType<typeof mapFirestoreDocsToStations>
  }> = []

  for (const collectionId of NETWORK_COLLECTION_IDS) {
    const snapshot = await db.collection(collectionId).get()
    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as Record<string, unknown>,
    }))
    manifest.bundles[collectionId] = {}

    for (const detailLevel of DETAIL_LEVELS) {
      const stations = mapFirestoreDocsToStations(docs, collectionId, detailLevel)
      const objectPath = `${EXPORT_PREFIX}/${collectionId}.${detailLevel}.json.gz`
      manifest.bundles[collectionId]![detailLevel] = await uploadGzipJsonArray(
        bucket,
        objectPath,
        stations
      )
      if (detailLevel === 'list') {
        listBatches.push({ collectionId, stations })
      }
      if (detailLevel === 'full') {
        fullBatches.push({ collectionId, stations })
      }
      if (detailLevel === 'lean') {
        leanBatches.push({ collectionId, stations })
      }
    }
  }

  manifest.bundles.all = {}
  const mergedList = mergeNetworkCollections(listBatches)
  manifest.bundles.all.list = await uploadGzipJsonArray(
    bucket,
    `${EXPORT_PREFIX}/all.list.json.gz`,
    mergedList
  )

  const mergedFull = mergeNetworkCollections(fullBatches)
  manifest.bundles.all.full = await uploadGzipJsonArray(
    bucket,
    `${EXPORT_PREFIX}/all.full.json.gz`,
    mergedFull
  )

  const mergedLean = mergeNetworkCollections(leanBatches)
  manifest.bundles.all.lean = await uploadGzipJsonArray(
    bucket,
    `${EXPORT_PREFIX}/all.lean.json.gz`,
    mergedLean
  )

  const tocSnapshot = await db.collection(TOC_OPERATORS_COLLECTION).get()
  const tocOperators: TocOperator[] = tocSnapshot.docs
    .map((docSnap) => mapTocOperatorDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((op): op is TocOperator => op != null)
    .sort((a, b) => a.name.localeCompare(b.name))
  manifest.references!.toc_operators = await uploadGzipJsonArray(
    bucket,
    `${EXPORT_PREFIX}/toc_operators.json.gz`,
    tocOperators,
    'itemCount'
  )

  await bucket.file(`${EXPORT_PREFIX}/manifest.json`).save(Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'), {
    metadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=60',
    },
  })

  return manifest
}
