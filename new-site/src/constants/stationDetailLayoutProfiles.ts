/**
 * Per-network station detail layout profiles (presets + registry).
 *
 * Full reference: ../components/models/StationDetails/stationdetail.md
 *
 * Adding a new network:
 * 1. Register it in stationCollections.ts (ids, labels, URL slug, stnarea, short URL code).
 * 2. Pick a preset below (or add a new preset if none fit).
 * 3. Add defineNetworkLayout({ networkName, preset, overrides? }) to STATION_DETAIL_LAYOUT_PROFILES.
 * 4. TypeScript will fail until Record<NetworkCollectionId, …> is complete.
 */

import type { NetworkCollectionId } from './stationCollections'
import { NETWORK_LABELS, NETWORK_STNAREA_DEFAULTS } from './stationCollections'
import type { StationUrlFieldKey } from '../utils/stationUrlField'

/** Catalog / empty-doc defaults that drive schema when no sample docs are present. */
export type StationDetailLayoutProfile = {
  networkName: string
  preset: StationDetailLayoutPresetId
  isLightRail: boolean
  defaultStnarea: string
  showBorough: boolean
  showFareZone: boolean
  showOperatorCode: boolean
  showStaffingLevel: boolean
  showNlc: boolean
  showGauge: boolean
  showMinConnectionTime: boolean
  showUrl: boolean
  urlFieldKey: StationUrlFieldKey
  urlFieldLabel: string
  showProvince: boolean
  showPostEirCode: boolean
  /** When true, Post/Eircode renders under Location instead of Details/Additional. */
  postEirCodeInLocation: boolean
  showUsageTab: boolean
  /** When true, operator/min-connection/province/postcode render in Details and Additional tab is hidden. */
  foldAdditionalIntoDetails: boolean
  /** When true, Step Free Status block renders under Details; when false, under Step-free & Lift tab. */
  stepFreeInDetails: boolean
  showStepFreeSection: boolean
  showStepFreeTab: boolean
  showStepFreeNote: boolean
  stepFreeTabLabel: string
  showLiftSection: boolean
  showToiletsSection: boolean
  showFacilitiesTab: boolean
  showServiceTab: boolean
  showAdminTab: boolean
  /** Routing URL slug field in the Admin tab. */
  showAdminUrlSlug: boolean
  showConnectionBus: boolean
  showConnectionTaxi: boolean
  showConnectionUnderground: boolean
  showConnectionTrain: boolean
  showLinesServed: boolean
  showPlatforms: boolean
  showDateOpened: boolean
  showRequestStop: boolean
  showLimitedService: boolean
  showStationStatusSection: boolean
  showTiploc: boolean
  requireCrsCode: boolean
  requireTiploc: boolean
  /**
   * When true, sampling/station docs can still reveal sections; profile forces certain
   * heritage-style flags on even when a field is empty (matches prior isHeritage behaviour).
   */
  forceShowUrl: boolean
  forceShowStepFreeSection: boolean
  forceShowStaffingLevel: boolean
  forceShowNlc: boolean
  forceShowGauge: boolean
  forceShowRequestStop: boolean
  forceShowStationStatusSection: boolean
  /** Heritage: step-free note / lift sections stay off even if nested data exists. */
  suppressStepFreeNote: boolean
  suppressLiftSection: boolean
}

export type StationDetailLayoutPresetId =
  | 'mainlineHeavyRail'
  | 'leanRegionalRail'
  | 'heritageRail'
  | 'lightRail'

type LayoutOverrides = Partial<
  Omit<StationDetailLayoutProfile, 'networkName' | 'preset' | 'defaultStnarea'>
>

const STEP_FREE_TAB_LABEL = 'Step-free & Lift access'

/** Shared heavy-rail catalog empty-doc baseline (most sections appear via sampling). */
const HEAVY_RAIL_CATALOG_BASE: Omit<
  StationDetailLayoutProfile,
  'networkName' | 'preset' | 'defaultStnarea'
> = {
  isLightRail: false,
  showBorough: false,
  showFareZone: false,
  showOperatorCode: false,
  showStaffingLevel: false,
  showNlc: false,
  showGauge: false,
  showMinConnectionTime: false,
  showUrl: false,
  urlFieldKey: 'urlSlug',
  urlFieldLabel: 'URL slug',
  showProvince: false,
  showPostEirCode: false,
  postEirCodeInLocation: false,
  showUsageTab: false,
  foldAdditionalIntoDetails: false,
  stepFreeInDetails: true,
  showStepFreeSection: false,
  showStepFreeTab: false,
  showStepFreeNote: false,
  stepFreeTabLabel: STEP_FREE_TAB_LABEL,
  showLiftSection: false,
  showToiletsSection: false,
  showFacilitiesTab: false,
  showServiceTab: false,
  showAdminTab: true,
  showAdminUrlSlug: true,
  showConnectionBus: false,
  showConnectionTaxi: false,
  showConnectionUnderground: false,
  showConnectionTrain: false,
  showLinesServed: false,
  showPlatforms: false,
  showDateOpened: false,
  showRequestStop: false,
  showLimitedService: false,
  showStationStatusSection: false,
  showTiploc: true,
  requireCrsCode: true,
  requireTiploc: true,
  forceShowUrl: false,
  forceShowStepFreeSection: false,
  forceShowStaffingLevel: false,
  forceShowNlc: false,
  forceShowGauge: false,
  forceShowRequestStop: false,
  forceShowStationStatusSection: false,
  suppressStepFreeNote: false,
  suppressLiftSection: false,
}

export const STATION_DETAIL_LAYOUT_PRESETS: Record<
  StationDetailLayoutPresetId,
  Omit<StationDetailLayoutProfile, 'networkName' | 'preset' | 'defaultStnarea'>
> = {
  /** Based on GB National Rail — CRS/Tiploc required; sections mostly data-driven. */
  mainlineHeavyRail: {
    ...HEAVY_RAIL_CATALOG_BASE,
    foldAdditionalIntoDetails: true,
    stepFreeInDetails: false,
  },

  /** Based on NI Translink / Irish Rail — lean regional; no Tiploc; Additional folded into Details. */
  leanRegionalRail: {
    ...HEAVY_RAIL_CATALOG_BASE,
    foldAdditionalIntoDetails: true,
    showTiploc: false,
    requireTiploc: false,
    showAdminUrlSlug: true,
    postEirCodeInLocation: true,
  },

  /** Based on GB Heritage — URL, NLC, gauge, staffing, service, step-free section. */
  heritageRail: {
    ...HEAVY_RAIL_CATALOG_BASE,
    showUrl: true,
    urlFieldKey: 'url',
    urlFieldLabel: 'URL',
    showBorough: true,
    showStepFreeSection: true,
    showStaffingLevel: true,
    showNlc: true,
    showGauge: true,
    showRequestStop: true,
    showServiceTab: true,
    requireCrsCode: false,
    requireTiploc: false,
    forceShowUrl: true,
    forceShowStepFreeSection: true,
    forceShowStaffingLevel: true,
    forceShowNlc: true,
    forceShowGauge: true,
    // Request stop stays data-driven when docs are present (matches prior sampling behaviour).
    forceShowRequestStop: false,
    forceShowStationStatusSection: true,
    suppressStepFreeNote: true,
    suppressLiftSection: true,
  },

  /** Based on South Yorkshire SuperTram — light-rail field set. */
  lightRail: {
    ...HEAVY_RAIL_CATALOG_BASE,
    isLightRail: true,
    showBorough: true,
    showFareZone: true,
    showStaffingLevel: true,
    showStepFreeSection: true,
    showStepFreeTab: true,
    showLiftSection: true,
    showServiceTab: true,
    showConnectionBus: true,
    showConnectionTrain: true,
    showLinesServed: true,
    showPlatforms: true,
    showDateOpened: true,
    showLimitedService: true,
    requireCrsCode: false,
    requireTiploc: false,
  },
}

export function defineNetworkLayout(options: {
  networkName: string
  networkId: NetworkCollectionId
  preset: StationDetailLayoutPresetId
  overrides?: LayoutOverrides
}): StationDetailLayoutProfile {
  const { networkName, networkId, preset, overrides } = options
  return {
    ...STATION_DETAIL_LAYOUT_PRESETS[preset],
    ...overrides,
    networkName,
    preset,
    defaultStnarea: NETWORK_STNAREA_DEFAULTS[networkId],
  }
}

export const STATION_DETAIL_LAYOUT_PROFILES: Record<
  NetworkCollectionId,
  StationDetailLayoutProfile
> = {
  stations_gbnr: defineNetworkLayout({
    networkName: NETWORK_LABELS.stations_gbnr,
    networkId: 'stations_gbnr',
    preset: 'mainlineHeavyRail',
  }),
  stations_nitranslink: defineNetworkLayout({
    networkName: NETWORK_LABELS.stations_nitranslink,
    networkId: 'stations_nitranslink',
    preset: 'leanRegionalRail',
  }),
  stations_roiirerail: defineNetworkLayout({
    networkName: NETWORK_LABELS.stations_roiirerail,
    networkId: 'stations_roiirerail',
    preset: 'leanRegionalRail',
  }),
  stations_gbheritage: defineNetworkLayout({
    networkName: NETWORK_LABELS.stations_gbheritage,
    networkId: 'stations_gbheritage',
    preset: 'heritageRail',
  }),
  lightrail_GBSHEFFSUPERTRAM: defineNetworkLayout({
    networkName: NETWORK_LABELS.lightrail_GBSHEFFSUPERTRAM,
    networkId: 'lightrail_GBSHEFFSUPERTRAM',
    preset: 'lightRail',
  }),
}

export function getStationDetailLayoutProfile(
  networkId: NetworkCollectionId
): StationDetailLayoutProfile {
  return STATION_DETAIL_LAYOUT_PROFILES[networkId]
}
