import { describe, expect, it } from 'vitest'
import { NETWORK_COLLECTION_IDS } from '@/constants/stationCollections'
import {
  buildStationCdnBundleUrl,
  getStationCdnManifestUrl,
  splitMergedStationsByCollection,
} from '@/services/stationsCdnService'
import type { Station } from '@/types'

describe('stationsCdnService', () => {
  it('builds manifest URL from storage bucket', () => {
    const previous = process.env.NEXT_PUBLIC_STATION_CDN_MANIFEST_URL
    const previousBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    delete process.env.NEXT_PUBLIC_STATION_CDN_MANIFEST_URL
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'rail-statistics.appspot.com'

    expect(getStationCdnManifestUrl()).toContain('station-exports%2Fmanifest.json')

    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = previousBucket
    process.env.NEXT_PUBLIC_STATION_CDN_MANIFEST_URL = previous
  })

  it('builds bundle URLs from storage paths', () => {
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'rail-statistics.appspot.com'
    const url = buildStationCdnBundleUrl('station-exports/stations_gbnr.list.json.gz')
    expect(url).toContain('station-exports%2Fstations_gbnr.list.json.gz')
  })

  it('splits merged stations by source collection', () => {
    const stations: Station[] = [
      {
        id: '1',
        stationName: 'A',
        crsCode: 'AAA',
        tiploc: null,
        latitude: 1,
        longitude: 2,
        country: null,
        county: null,
        toc: null,
        stnarea: null,
        yearlyPassengers: null,
        sourceCollectionId: 'stations_gbnr',
      },
      {
        id: '2',
        stationName: 'B',
        crsCode: 'BBB',
        tiploc: null,
        latitude: 3,
        longitude: 4,
        country: null,
        county: null,
        toc: null,
        stnarea: null,
        yearlyPassengers: null,
        sourceCollectionId: 'stations_nitranslink',
      },
    ]

    const grouped = splitMergedStationsByCollection(stations)
    expect(grouped.get('stations_gbnr')).toHaveLength(1)
    expect(grouped.get('stations_nitranslink')).toHaveLength(1)
    for (const collectionId of NETWORK_COLLECTION_IDS) {
      expect(grouped.has(collectionId)).toBe(true)
    }
  })
})
