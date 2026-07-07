import type { NetworkCollectionId } from '@/constants/stationCollections'
import type { Station } from '@/types'

/** Fields sufficient for map markers and SuperTram timeline filtering. */
export type MapLeanStation = Pick<
  Station,
  | 'id'
  | 'stationName'
  | 'crsCode'
  | 'latitude'
  | 'longitude'
  | 'sourceCollectionId'
  | 'linesServed'
  | 'dateOpened'
  | 'stnarea'
  | 'toc'
> & {
  tiploc: null
  country: null
  county: null
  borough: null
  fareZone: null
  yearlyPassengers: null
}

export function toMapLeanStation(station: Station): MapLeanStation {
  return {
    id: station.id,
    stationName: station.stationName,
    crsCode: station.crsCode,
    tiploc: null,
    latitude: station.latitude,
    longitude: station.longitude,
    country: null,
    county: null,
    toc: station.toc,
    stnarea: station.stnarea,
    borough: null,
    fareZone: null,
    yearlyPassengers: null,
    sourceCollectionId: station.sourceCollectionId,
    linesServed: station.linesServed ?? null,
    dateOpened: station.dateOpened ?? null,
  }
}

export function resolveFullStationFromCache(
  station: Station,
  fullById: Map<string, Station>
): Station {
  return fullById.get(station.id) ?? station
}

export function buildFullStationIndex(stations: Station[]): Map<string, Station> {
  return new Map(stations.map((station) => [station.id, station]))
}

export function mergeNetworkCollections(
  batches: Array<{ collectionId: NetworkCollectionId; stations: Station[] }>
): Station[] {
  return batches
    .flatMap((batch) => batch.stations)
    .sort((a, b) => a.stationName.localeCompare(b.stationName))
}
