import type { NetworkCollectionId } from '../constants/stationCollections'
import { STNAREA_TO_NETWORK_COLLECTION } from '../constants/stationCollections'
import { inferProvinceFromCounty } from './irishProvinceFromCounty'

const PROVINCE_LOCALE_COLLECTION_IDS = new Set<NetworkCollectionId>([
  'stations_roiirerail',
  'stations_nitranslink',
])

export type StationLocaleParts = {
  country?: string | null
  county?: string | null
  borough?: string | null
  province?: string | null
  sourceCollectionId?: NetworkCollectionId
  stnarea?: string | null
}

function resolveProvinceForDisplay(station: StationLocaleParts): string {
  const direct = (station.province ?? '').trim()
  if (direct) return direct
  if (!usesProvinceLocaleFormat(station)) return ''
  return inferProvinceFromCounty(station.county) ?? ''
}

export function isGreaterLondonCounty(county?: string | null): boolean {
  return (county ?? '').trim().toLowerCase() === 'greater london'
}

export function usesProvinceLocaleFormat(station: StationLocaleParts): boolean {
  if (station.sourceCollectionId && PROVINCE_LOCALE_COLLECTION_IDS.has(station.sourceCollectionId)) {
    return true
  }

  const stnarea = (station.stnarea ?? '').trim().toUpperCase()
  if (stnarea) {
    const collectionId = STNAREA_TO_NETWORK_COLLECTION[stnarea]
    if (collectionId && PROVINCE_LOCALE_COLLECTION_IDS.has(collectionId)) {
      return true
    }
  }

  const country = (station.country ?? '').trim().toLowerCase()
  return country.includes('ireland')
}

function formatLocaleDisplay(country: string, region: string, locality: string): string {
  if (!country && !region && !locality) return ''

  if (country && region && locality) {
    return `${country}, ${region} (${locality})`
  }
  if (country && region) return `${country}, ${region}`
  if (country && locality) return `${country} (${locality})`
  if (region && locality) return `${region} (${locality})`

  return country || region || locality
}

export function formatStationLocaleDisplay(station: StationLocaleParts): string {
  const country = (station.country ?? '').trim()
  const county = (station.county ?? '').trim()
  const borough = (station.borough ?? '').trim()
  const province = resolveProvinceForDisplay(station)

  if (usesProvinceLocaleFormat(station)) {
    return formatLocaleDisplay(country, province, county)
  }

  return formatLocaleDisplay(country, county, borough)
}

export function formatStationLocationDisplay(params: StationLocaleParts): string {
  const county = (params.county ?? '').trim()
  const country = (params.country ?? '').trim()
  const borough = (params.borough ?? '').trim()
  const province = resolveProvinceForDisplay(params)
  const locality = usesProvinceLocaleFormat(params) ? province : borough

  return [locality, county, country].filter(Boolean).join(', ')
}

/** Map side-panel copy — falls back to locale/borough for light-rail lean rows. */
export function formatMapPanelLocationDisplay(station: StationLocaleParts & {
  stationName?: string
  sourceCollectionId?: string | null
  stnarea?: string | null
}): string {
  const direct = formatStationLocationDisplay(station)
  if (direct) return direct

  const locale = formatStationLocaleDisplay(station)
  if (locale) return locale

  const borough = (station.borough ?? '').trim()
  if (borough) return borough

  if (
    station.sourceCollectionId === 'lightrail_GBSHEFFSUPERTRAM' ||
    station.stnarea?.trim().toUpperCase() === 'GBSHEFFSUPERTRAM'
  ) {
    return 'South Yorkshire'
  }

  return ''
}

