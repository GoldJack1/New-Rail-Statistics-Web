import {
  mapFirestoreDocsToStations,
  type FirestoreStationDocInput,
  type StationFetchDetailLevel,
} from '@/services/stationFirestoreMapper'
import type { StationCollectionId } from '@/constants/stationCollections'
import type { Station } from '@/types'

interface WorkerRequest {
  requestId: number
  docs: FirestoreStationDocInput[]
  collectionName: StationCollectionId
  detailLevel: StationFetchDetailLevel
}

interface WorkerResponse {
  requestId: number
  stations: Station[]
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { requestId, docs, collectionName, detailLevel } = event.data
  const stations = mapFirestoreDocsToStations(docs, collectionName, detailLevel)
  const response: WorkerResponse = { requestId, stations }
  self.postMessage(response)
}
