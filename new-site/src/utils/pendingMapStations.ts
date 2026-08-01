import { resolvePendingTargetCollectionId } from './pendingChangesByCollection'
import type { PendingChangeEntry } from '../contexts/pendingStationChangesTypes'
import type { NetworkViewFilter } from '../constants/stationCollections'
import { isNetworkCollection } from '../constants/stationCollections'
import type { Station } from '../types'
import { LIGHT_RAIL_DOC_FIELDS } from './lightRailStationFields'
import { getStationMapKey, getStationNetworkCollectionId } from './stationAreaSlug'
import { isValidStationCoordinate } from './stationCoordinates'

export function pendingEntryToMapStation(stationId: string, entry: PendingChangeEntry): Station | null {
  if (!entry.isNew) return null

  const latitude =
    typeof entry.updated.latitude === 'number' ? entry.updated.latitude : entry.original.latitude
  const longitude =
    typeof entry.updated.longitude === 'number' ? entry.updated.longitude : entry.original.longitude

  if (!isValidStationCoordinate(latitude, longitude)) return null

  const resolvedCollectionId = resolvePendingTargetCollectionId(entry)
  const sourceCollectionId = isNetworkCollection(resolvedCollectionId) ? resolvedCollectionId : undefined

  return {
    ...entry.original,
    ...entry.updated,
    id: stationId,
    stationName: entry.updated.stationName ?? entry.original.stationName,
    crsCode: entry.updated.crsCode ?? entry.original.crsCode,
    tiploc: entry.updated.tiploc ?? entry.original.tiploc,
    latitude,
    longitude,
    country: entry.updated.country ?? entry.original.country,
    county: entry.updated.county ?? entry.original.county,
    toc: entry.updated.toc ?? entry.original.toc,
    stnarea: entry.updated.stnarea ?? entry.original.stnarea,
    borough: entry.updated.borough ?? entry.original.borough,
    fareZone: entry.updated.fareZone ?? entry.original.fareZone,
    yearlyPassengers: (entry.updated.yearlyPassengers ??
      entry.original.yearlyPassengers) as Station['yearlyPassengers'],
    sourceCollectionId,
  }
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Light-rail timeline fields are stored as raw Firestore keys in `sandboxUpdated`, so unpublished
 * edits need mapping onto the `Station` shape for the SuperTram timeline to see them.
 */
export function applyPendingTimelineFields(
  station: Station,
  entry: PendingChangeEntry | undefined
): Station {
  if (!entry || entry.isNew) return station

  const stationCollection = getStationNetworkCollectionId(station)
  if (stationCollection && resolvePendingTargetCollectionId(entry) !== stationCollection) {
    return station
  }

  const sandbox = entry.sandboxUpdated as Record<string, unknown> | undefined
  if (!sandbox) return station

  const dateOpened = sandbox[LIGHT_RAIL_DOC_FIELDS.dateOpened]
  const orderOfOpening = sandbox[LIGHT_RAIL_DOC_FIELDS.orderOfOpening]
  if (dateOpened === undefined && orderOfOpening === undefined) return station

  return {
    ...station,
    ...(dateOpened === undefined ? {} : { dateOpened: toOptionalString(dateOpened) }),
    ...(orderOfOpening === undefined ? {} : { orderOfOpening: toOptionalString(orderOfOpening) }),
  }
}

export function mergePendingNewStationsForMap(
  firestoreStations: Station[],
  pendingChanges: Record<string, PendingChangeEntry>,
  networkView: NetworkViewFilter
): { stations: Station[]; pendingNewKeys: Set<string> } {
  const stationsWithPendingEdits = firestoreStations.map((station) =>
    applyPendingTimelineFields(station, pendingChanges[station.id])
  )
  const existingKeys = new Set(stationsWithPendingEdits.map(getStationMapKey))
  const pendingNewKeys = new Set<string>()
  const pendingStations: Station[] = []

  for (const [id, entry] of Object.entries(pendingChanges)) {
    const station = pendingEntryToMapStation(id, entry)
    if (!station) continue

    const key = getStationMapKey(station)
    if (existingKeys.has(key)) continue
    if (networkView !== 'all' && station.sourceCollectionId !== networkView) continue

    pendingNewKeys.add(key)
    pendingStations.push(station)
  }

  return { stations: [...stationsWithPendingEdits, ...pendingStations], pendingNewKeys }
}
