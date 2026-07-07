import type { StationCollectionId } from '@/constants/stationCollections'
import { isNetworkCollection } from '@/constants/stationCollections'
import type { Station } from '@/types'
import { mapStationDetailFieldsFromFirestore } from '@/utils/stationsTableColumnCatalog'
import { extractYearlyPassengersFromFirestoreData } from '@/utils/yearlyPassengers'

export type StationFetchDetailLevel = 'full' | 'list' | 'lean'

export interface FirestoreStationDocInput {
  id: string
  data: Record<string, unknown>
}

export function parseLocationString(
  locationString: string
): { latitude: number; longitude: number } | null {
  try {
    if (!locationString || typeof locationString !== 'string') {
      return null
    }

    if (locationString.includes('°')) {
      const cleanString = locationString.replace(/[[\]]/g, '')
      const parts = cleanString.split(',')

      if (parts.length === 2) {
        const latPart = parts[0].trim()
        const latMatch = latPart.match(/(\d+\.?\d*)\s*°\s*([NS])/i)

        const lngPart = parts[1].trim()
        const lngMatch = lngPart.match(/(\d+\.?\d*)\s*°\s*([EW])/i)

        if (latMatch && lngMatch) {
          let latitude = parseFloat(latMatch[1])
          let longitude = parseFloat(lngMatch[1])

          if (latMatch[2].toUpperCase() === 'S') latitude = -latitude
          if (lngMatch[2].toUpperCase() === 'W') longitude = -longitude

          return { latitude, longitude }
        }
      }
    }

    if (locationString.startsWith('[') && locationString.endsWith(']')) {
      const cleanString = locationString.replace(/[[\]]/g, '')
      const parts = cleanString.split(',')

      if (parts.length === 2) {
        const latitude = parseFloat(parts[0].trim())
        const longitude = parseFloat(parts[1].trim())

        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude }
        }
      }
    }

    if (locationString.includes(',')) {
      const parts = locationString.split(',')
      if (parts.length === 2) {
        const latitude = parseFloat(parts[0].trim())
        const longitude = parseFloat(parts[1].trim())

        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude }
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing location string:', locationString, error)
    return null
  }
}

function extractCoordinatesFromFirestoreData(data: Record<string, unknown>): {
  latitude: number
  longitude: number
} {
  let latitude = 0
  let longitude = 0
  let extracted = false

  if (data.location) {
    if (typeof data.location === 'string') {
      const coords = parseLocationString(data.location)
      if (coords) {
        latitude = coords.latitude
        longitude = coords.longitude
        extracted = true
      }
    } else if (Array.isArray(data.location) && data.location.length >= 2) {
      const lat = parseFloat(String(data.location[0]))
      const lng = parseFloat(String(data.location[1]))

      if (!isNaN(lat) && !isNaN(lng)) {
        latitude = lat
        longitude = lng
        extracted = true
      }
    } else if (typeof data.location === 'object' && data.location !== null) {
      const location = data.location as Record<string, unknown>
      const lat = parseFloat(String(location.latitude ?? location.lat))
      const lng = parseFloat(String(location.longitude ?? location.lng ?? location.lon))

      if (!isNaN(lat) && !isNaN(lng)) {
        latitude = lat
        longitude = lng
        extracted = true
      }
    }
  }

  if (!extracted && data.latitude && data.longitude) {
    const latField = data.latitude as Record<string, unknown> | number
    const lngField = data.longitude as Record<string, unknown> | number

    if (
      typeof latField === 'object' &&
      latField !== null &&
      typeof lngField === 'object' &&
      lngField !== null &&
      latField._lat !== undefined &&
      lngField._long !== undefined
    ) {
      latitude = Number(latField._lat)
      longitude = Number(lngField._long)
      extracted = true
    } else if (
      typeof latField === 'object' &&
      latField !== null &&
      typeof lngField === 'object' &&
      lngField !== null &&
      latField.latitude !== undefined &&
      lngField.longitude !== undefined
    ) {
      latitude = Number(latField.latitude)
      longitude = Number(lngField.longitude)
      extracted = true
    } else if (typeof latField === 'number' && typeof lngField === 'number') {
      latitude = latField
      longitude = lngField
      extracted = true
    } else if (typeof latField === 'object' && typeof lngField === 'object') {
      const latValues = Object.values(latField).filter((v) => typeof v === 'number')
      const lngValues = Object.values(lngField).filter((v) => typeof v === 'number')

      if (latValues.length > 0 && lngValues.length > 0) {
        latitude = latValues[0] as number
        longitude = lngValues[0] as number
        extracted = true
      }
    }
  }

  return { latitude, longitude }
}

function readBorough(data: Record<string, unknown>): string | null {
  let borough: string | null = (data.borough ?? data.Borough ?? null) as string | null
  if (borough == null) {
    const legacy =
      data.londonBorough ??
      data['London Borough'] ??
      data.LondonBorough ??
      data.london_borough ??
      null
    if (legacy != null && legacy !== '') borough = String(legacy)
  }
  if (borough == null && typeof data.address === 'object' && data.address !== null) {
    const addr = data.address as Record<string, unknown>
    const b = addr.borough ?? addr.Borough
    if (b != null && b !== '') borough = String(b)
  }
  return borough != null && borough !== '' ? String(borough) : null
}

function readLinesServed(data: Record<string, unknown>): string | null {
  return data['Lines Served'] != null && String(data['Lines Served']).trim() !== ''
    ? String(data['Lines Served'])
    : null
}

function readDateOpened(data: Record<string, unknown>): string | null {
  return data['Date Opened'] != null && String(data['Date Opened']).trim() !== ''
    ? String(data['Date Opened'])
    : null
}

export function mapFirestoreDocToStation(
  docId: string,
  data: Record<string, unknown>,
  collectionName: StationCollectionId,
  detailLevel: StationFetchDetailLevel
): Station {
  const { latitude, longitude } = extractCoordinatesFromFirestoreData(data)
  const linesServed = readLinesServed(data)
  const dateOpened = readDateOpened(data)

  if (detailLevel === 'lean') {
    return {
      id: docId,
      stationName: String(data.stationname || data.stationName || data.StopName || ''),
      crsCode: String(data.CrsCode || data.crsCode || ''),
      tiploc: null,
      latitude,
      longitude,
      country: null,
      county: null,
      toc: data.TOC || data.toc ? String(data.TOC || data.toc) : null,
      stnarea: data.stnarea || data.STNAREA ? String(data.stnarea || data.STNAREA) : null,
      borough: null,
      fareZone: null,
      yearlyPassengers: null,
      linesServed,
      dateOpened,
      ...(isNetworkCollection(collectionName) ? { sourceCollectionId: collectionName } : {}),
    }
  }

  const fareZoneRaw = data.fareZone ?? data.fare_zone ?? data.FareZone ?? data['Fare Zone'] ?? data.farezone
  const fareZone = fareZoneRaw != null && fareZoneRaw !== '' ? String(fareZoneRaw) : null
  const borough = readBorough(data)

  const baseStation: Station = {
    id: docId,
    stationName: String(data.stationname || data.stationName || data.StopName || ''),
    crsCode: String(data.CrsCode || data.crsCode || ''),
    tiploc: data.tiploc ? String(data.tiploc) : null,
    latitude,
    longitude,
    country: data.country || data.Country ? String(data.country || data.Country) : null,
    county: data.county || data.County ? String(data.county || data.County) : null,
    toc: data.TOC || data.toc ? String(data.TOC || data.toc) : null,
    stnarea: data.stnarea || data.STNAREA ? String(data.stnarea || data.STNAREA) : null,
    borough,
    fareZone,
    yearlyPassengers: extractYearlyPassengersFromFirestoreData(data),
    urlSlug: String(data.urlSlug ?? '').trim() || null,
    stationUrl: String(data.url ?? '').trim() || null,
    linesServed,
    dateOpened,
    ...(isNetworkCollection(collectionName) ? { sourceCollectionId: collectionName } : {}),
  }

  if (detailLevel === 'list') {
    return baseStation
  }

  return {
    ...baseStation,
    ...mapStationDetailFieldsFromFirestore(data),
  }
}

export function mapFirestoreDocsToStations(
  docs: FirestoreStationDocInput[],
  collectionName: StationCollectionId,
  detailLevel: StationFetchDetailLevel
): Station[] {
  return docs.map((doc) => mapFirestoreDocToStation(doc.id, doc.data, collectionName, detailLevel))
}
