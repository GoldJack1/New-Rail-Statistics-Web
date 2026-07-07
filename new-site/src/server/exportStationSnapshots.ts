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

const EXPORT_PREFIX = 'station-exports'
const DETAIL_LEVELS: StationFetchDetailLevel[] = ['list', 'full', 'lean']

async function uploadBundle(
  bucket: ReturnType<ReturnType<typeof getStorage>['bucket']>,
  objectPath: string,
  stations: unknown[]
) {
  const gzip = gzipSync(Buffer.from(JSON.stringify(stations), 'utf8'))
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
    stationCount: stations.length,
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
  }

  const listBatches: Array<{
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
      manifest.bundles[collectionId]![detailLevel] = await uploadBundle(bucket, objectPath, stations)
      if (detailLevel === 'list') {
        listBatches.push({ collectionId, stations })
      }
    }
  }

  manifest.bundles.all = {}
  const mergedList = mergeNetworkCollections(listBatches)
  manifest.bundles.all.list = await uploadBundle(
    bucket,
    `${EXPORT_PREFIX}/all.list.json.gz`,
    mergedList
  )

  const mergedLean = mergeNetworkCollections(
    await Promise.all(
      NETWORK_COLLECTION_IDS.map(async (collectionId) => {
        const snapshot = await db.collection(collectionId).get()
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data() as Record<string, unknown>,
        }))
        return {
          collectionId,
          stations: mapFirestoreDocsToStations(docs, collectionId, 'lean'),
        }
      })
    )
  )
  manifest.bundles.all.lean = await uploadBundle(
    bucket,
    `${EXPORT_PREFIX}/all.lean.json.gz`,
    mergedLean
  )

  await bucket.file(`${EXPORT_PREFIX}/manifest.json`).save(Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'), {
    metadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=60',
    },
  })

  return manifest
}
