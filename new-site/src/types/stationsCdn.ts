import type { NetworkCollectionId } from '@/constants/stationCollections'
import type { StationFetchDetailLevel } from '@/services/stationFirestoreMapper'

export type StationCdnBundleLevel = Extract<StationFetchDetailLevel, 'full' | 'list' | 'lean'>

export interface StationCdnBundleRef {
  /** Storage object path, e.g. station-exports/stations_gbnr.list.json.gz */
  path: string
  encoding?: 'gzip' | 'identity'
  byteLength?: number
  stationCount?: number
  /** Item count for non-station reference bundles (e.g. toc_operators). */
  itemCount?: number
}

export interface StationsCdnReferenceBundles {
  toc_operators?: StationCdnBundleRef
}

export interface StationsCdnManifest {
  version: string
  generatedAt: string
  bundles: Partial<Record<NetworkCollectionId | 'all', Partial<Record<StationCdnBundleLevel, StationCdnBundleRef>>>>
  /** Non-station reference snapshots (TOC colours, etc.). */
  references?: StationsCdnReferenceBundles
}
