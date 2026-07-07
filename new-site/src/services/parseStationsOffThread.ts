import type { StationCollectionId } from '@/constants/stationCollections'
import type { Station } from '@/types'
import {
  mapFirestoreDocsToStations,
  type FirestoreStationDocInput,
  type StationFetchDetailLevel,
} from '@/services/stationFirestoreMapper'

const WORKER_PARSE_THRESHOLD = 150

let worker: Worker | null = null
let requestId = 0

function getStationParseWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null
  }

  if (!worker) {
    try {
      worker = new Worker(new URL('../workers/stationParse.worker.ts', import.meta.url))
    } catch {
      return null
    }
  }

  return worker
}

export async function parseStationsOffThread(
  docs: FirestoreStationDocInput[],
  collectionName: StationCollectionId,
  detailLevel: StationFetchDetailLevel
): Promise<Station[]> {
  if (docs.length < WORKER_PARSE_THRESHOLD) {
    return mapFirestoreDocsToStations(docs, collectionName, detailLevel)
  }

  const parseWorker = getStationParseWorker()
  if (!parseWorker) {
    return mapFirestoreDocsToStations(docs, collectionName, detailLevel)
  }

  const currentRequestId = ++requestId

  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent<{ requestId: number; stations: Station[] }>) => {
      if (event.data.requestId !== currentRequestId) return
      parseWorker.removeEventListener('message', handleMessage)
      parseWorker.removeEventListener('error', handleError)
      resolve(event.data.stations)
    }

    const handleError = (error: ErrorEvent) => {
      parseWorker.removeEventListener('message', handleMessage)
      parseWorker.removeEventListener('error', handleError)
      reject(error.error ?? new Error('Station parse worker failed'))
    }

    parseWorker.addEventListener('message', handleMessage)
    parseWorker.addEventListener('error', handleError)
    parseWorker.postMessage({ requestId: currentRequestId, docs, collectionName, detailLevel })
  })
}
