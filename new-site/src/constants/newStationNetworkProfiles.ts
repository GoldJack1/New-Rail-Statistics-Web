/**
 * Create-station form field visibility per network.
 *
 * Overlapping flags should stay consistent with stationDetailLayoutProfiles where they
 * already match. Create forms intentionally expose more fields than the catalog empty-doc
 * path for some networks (e.g. GB National Rail) — do not derive those from layout catalog
 * defaults or create UX will change. See StationDetails/stationdetail.md.
 */

import type { NetworkCollectionId } from './stationCollections'
import { NETWORK_LABELS, NETWORK_STNAREA_DEFAULTS } from './stationCollections'
import { getStationDetailLayoutProfile } from './stationDetailLayoutProfiles'

export type NewStationNetworkProfile = {
  description: string
  defaultStnarea: string
  showBorough: boolean
  showFareZone: boolean
  showNlc: boolean
  showGauge: boolean
  showStaffingLevel: boolean
  showMinConnectionTime: boolean
  showOperatorCode: boolean
  showStepFreeTab: boolean
  showFacilitiesTab: boolean
  showRequestStop: boolean
}

function buildNewStationProfile(
  networkId: NetworkCollectionId,
  description: string,
  fields: Omit<NewStationNetworkProfile, 'description' | 'defaultStnarea'>
): NewStationNetworkProfile {
  const layout = getStationDetailLayoutProfile(networkId)
  return {
    description,
    // Shared with layout profile / NETWORK_STNAREA_DEFAULTS
    defaultStnarea: layout.defaultStnarea || NETWORK_STNAREA_DEFAULTS[networkId],
    ...fields,
  }
}

export const NEW_STATION_NETWORK_PROFILES: Record<NetworkCollectionId, NewStationNetworkProfile> = {
  stations_gbnr: buildNewStationProfile(
    'stations_gbnr',
    `${NETWORK_LABELS.stations_gbnr} — borough, fare zones; facilities/accessibility via Knowledgebase.`,
    {
      showBorough: true,
      showFareZone: true,
      showNlc: false,
      showGauge: false,
      showStaffingLevel: false,
      showMinConnectionTime: false,
      showOperatorCode: false,
      showStepFreeTab: false,
      showFacilitiesTab: false,
      showRequestStop: false,
    }
  ),
  stations_nitranslink: buildNewStationProfile(
    'stations_nitranslink',
    `${NETWORK_LABELS.stations_nitranslink} — province, post/Eircode, and core station details.`,
    {
      showBorough: false,
      showFareZone: false,
      showNlc: false,
      showGauge: false,
      showStaffingLevel: false,
      showMinConnectionTime: false,
      showOperatorCode: true,
      showStepFreeTab: false,
      showFacilitiesTab: false,
      showRequestStop: false,
    }
  ),
  stations_roiirerail: buildNewStationProfile(
    'stations_roiirerail',
    `${NETWORK_LABELS.stations_roiirerail} — province, post/Eircode, and core station details.`,
    {
      showBorough: false,
      showFareZone: false,
      showNlc: false,
      showGauge: false,
      showStaffingLevel: false,
      showMinConnectionTime: false,
      showOperatorCode: true,
      showStepFreeTab: false,
      showFacilitiesTab: false,
      showRequestStop: false,
    }
  ),
  stations_gbheritage: buildNewStationProfile(
    'stations_gbheritage',
    `${NETWORK_LABELS.stations_gbheritage} — borough, NLC, gauge, staffing, station status, step-free, URL, and request-stop fields.`,
    {
      showBorough: true,
      showFareZone: false,
      showNlc: true,
      showGauge: true,
      showStaffingLevel: true,
      showMinConnectionTime: false,
      showOperatorCode: false,
      showStepFreeTab: true,
      showFacilitiesTab: false,
      showRequestStop: true,
    }
  ),
  lightrail_GBSHEFFSUPERTRAM: buildNewStationProfile(
    'lightrail_GBSHEFFSUPERTRAM',
    `${NETWORK_LABELS.lightrail_GBSHEFFSUPERTRAM} — borough, fare zones, lines, platforms, step-free, lift, and bus/train connections.`,
    {
      showBorough: true,
      showFareZone: true,
      showNlc: false,
      showGauge: false,
      showStaffingLevel: true,
      showMinConnectionTime: false,
      showOperatorCode: false,
      showStepFreeTab: true,
      showFacilitiesTab: false,
      showRequestStop: false,
    }
  ),
}

export function getNewStationNetworkProfile(collectionId: NetworkCollectionId): NewStationNetworkProfile {
  return NEW_STATION_NETWORK_PROFILES[collectionId]
}
