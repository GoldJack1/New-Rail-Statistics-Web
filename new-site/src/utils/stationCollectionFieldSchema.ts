/**
 * Infer which station detail / form fields exist for a network.
 * Catalog defaults come from stationDetailLayoutProfiles; sampling merges data-driven sections.
 */

import type { StationCollectionId } from '../constants/stationCollections'
import { isNetworkCollection } from '../constants/stationCollections'
import {
  getStationDetailLayoutProfile,
  type StationDetailLayoutProfile,
} from '../constants/stationDetailLayoutProfiles'
import type { StationUrlFieldKey } from './stationUrlField'
import { getStationUrlFieldKey, getStationUrlFieldLabel } from './stationUrlField'
import { LIGHT_RAIL_DOC_FIELDS } from './lightRailStationFields'
import { filterKnowledgebaseOverlapFacilityKeys } from './knowledgebaseOverlapFacilityKeys'

export type StationDetailsTab =
  | 'details'
  | 'location'
  | 'usage'
  | 'additional'
  | 'stepFree'
  | 'service'
  | 'facilities'
  | 'admin'
  /** Dynamic Knowledgebase sidebar sections, e.g. `kb:Accessibility`. */
  | `kb:${string}`

export const STEP_FREE_SECTION_LABEL = 'Step Free Status'

export type StationCollectionFieldSchema = {
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
  postEirCodeInLocation: boolean
  showUsageTab: boolean
  foldAdditionalIntoDetails: boolean
  stepFreeInDetails: boolean
  showStepFreeSection: boolean
  showStepFreeTab: boolean
  showStepFreeNote: boolean
  stepFreeTabLabel: string
  showLiftSection: boolean
  showToiletsSection: boolean
  showFacilitiesTab: boolean
  facilityKeys: string[]
  showServiceTab: boolean
  /** GBNR-only live NRE Knowledgebase tab (not stored in Firebase). */
  showKnowledgebaseTab: boolean
  showAdminTab: boolean
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
}

const BOROUGH_KEYS = ['borough', 'Borough']
const FARE_ZONE_KEYS = ['fareZone', 'fare_zone', 'FareZone', 'farezone', 'Fare Zone']

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  return false
}

function collectPopulatedNestedKeys(docs: Record<string, unknown>[], parent: string): Set<string> {
  const keys = new Set<string>()
  for (const doc of docs) {
    const nested = doc[parent]
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue
    for (const [key, value] of Object.entries(nested as Record<string, unknown>)) {
      if (!isEmpty(value)) keys.add(`${parent}.${key}`)
    }
  }
  return keys
}

function hasPopulatedTopLevel(docs: Record<string, unknown>[], keys: string[]): boolean {
  return keys.some((key) => docs.some((doc) => !isEmpty(doc[key])))
}

function hasPopulatedNested(docs: Record<string, unknown>[], parent: string, child: string): boolean {
  return docs.some((doc) => {
    const nested = doc[parent]
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return false
    return !isEmpty((nested as Record<string, unknown>)[child])
  })
}

function collectFacilityKeys(docs: Record<string, unknown>[]): string[] {
  const keys = new Set<string>()
  for (const doc of docs) {
    const facilities = doc.facilities
    if (!facilities || typeof facilities !== 'object' || Array.isArray(facilities)) continue
    for (const [key, value] of Object.entries(facilities as Record<string, unknown>)) {
      if (!isEmpty(value)) keys.add(key)
    }
  }
  return [...keys].sort()
}

export const EMPTY_STATION_COLLECTION_FIELD_SCHEMA: StationCollectionFieldSchema = {
  isLightRail: false,
  defaultStnarea: '',
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
  stepFreeTabLabel: 'Step-free & Lift access',
  showLiftSection: false,
  showToiletsSection: false,
  showFacilitiesTab: false,
  facilityKeys: [],
  showServiceTab: false,
  showKnowledgebaseTab: false,
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
}

function schemaFromLayoutProfile(profile: StationDetailLayoutProfile): StationCollectionFieldSchema {
  return {
    isLightRail: profile.isLightRail,
    defaultStnarea: profile.defaultStnarea,
    showBorough: profile.showBorough,
    showFareZone: profile.showFareZone,
    showOperatorCode: profile.showOperatorCode,
    showStaffingLevel: profile.showStaffingLevel,
    showNlc: profile.showNlc,
    showGauge: profile.showGauge,
    showMinConnectionTime: profile.showMinConnectionTime,
    showUrl: profile.showUrl,
    urlFieldKey: profile.urlFieldKey,
    urlFieldLabel: profile.urlFieldLabel,
    showProvince: profile.showProvince,
    showPostEirCode: profile.showPostEirCode,
    postEirCodeInLocation: profile.postEirCodeInLocation,
    showUsageTab: profile.showUsageTab,
    foldAdditionalIntoDetails: profile.foldAdditionalIntoDetails,
    stepFreeInDetails: profile.stepFreeInDetails,
    showStepFreeSection: profile.showStepFreeSection,
    showStepFreeTab: profile.showStepFreeTab,
    showStepFreeNote: profile.showStepFreeNote,
    stepFreeTabLabel: profile.stepFreeTabLabel,
    showLiftSection: profile.showLiftSection,
    showToiletsSection: profile.showToiletsSection,
    showFacilitiesTab: profile.showFacilitiesTab,
    facilityKeys: [],
    showServiceTab: profile.showServiceTab,
    showKnowledgebaseTab: profile.showKnowledgebaseTab,
    showAdminTab: profile.showAdminTab,
    showAdminUrlSlug: profile.showAdminUrlSlug,
    showConnectionBus: profile.showConnectionBus,
    showConnectionTaxi: profile.showConnectionTaxi,
    showConnectionUnderground: profile.showConnectionUnderground,
    showConnectionTrain: profile.showConnectionTrain,
    showLinesServed: profile.showLinesServed,
    showPlatforms: profile.showPlatforms,
    showDateOpened: profile.showDateOpened,
    showRequestStop: profile.showRequestStop,
    showLimitedService: profile.showLimitedService,
    showStationStatusSection: profile.showStationStatusSection,
    showTiploc: profile.showTiploc,
    requireCrsCode: profile.requireCrsCode,
    requireTiploc: profile.requireTiploc,
  }
}

function getLayoutProfileForCollection(
  collectionId?: StationCollectionId
): StationDetailLayoutProfile | null {
  if (!collectionId || !isNetworkCollection(collectionId)) return null
  return getStationDetailLayoutProfile(collectionId)
}

export function inferStationCollectionFieldSchema(
  docs: Record<string, unknown>[],
  collectionId?: StationCollectionId
): StationCollectionFieldSchema {
  const profile = getLayoutProfileForCollection(collectionId)
  const catalogSchema = profile
    ? schemaFromLayoutProfile(profile)
    : {
        ...EMPTY_STATION_COLLECTION_FIELD_SCHEMA,
        urlFieldKey: collectionId ? getStationUrlFieldKey(collectionId) : 'urlSlug',
        urlFieldLabel: collectionId ? getStationUrlFieldLabel(collectionId) : 'URL slug',
      }

  if (docs.length === 0) {
    return catalogSchema
  }

  if (catalogSchema.isLightRail) {
    const defaultStnarea = catalogSchema.defaultStnarea
    return {
      ...EMPTY_STATION_COLLECTION_FIELD_SCHEMA,
      isLightRail: true,
      defaultStnarea,
      showBorough: hasPopulatedTopLevel(docs, BOROUGH_KEYS),
      showFareZone: hasPopulatedTopLevel(docs, [...FARE_ZONE_KEYS, LIGHT_RAIL_DOC_FIELDS.fareZone]),
      showLinesServed: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.linesServed]),
      showPlatforms: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.platforms]),
      showStepFreeSection: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.isStepFree]),
      showStepFreeTab: hasPopulatedTopLevel(docs, [
        LIGHT_RAIL_DOC_FIELDS.isStepFree,
        LIGHT_RAIL_DOC_FIELDS.hasLift,
      ]),
      showLiftSection: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.hasLift]),
      showDateOpened: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.dateOpened]),
      showLimitedService: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.isLimitedService]),
      showStaffingLevel: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.isStaffed]),
      showConnectionBus: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.bus]),
      showConnectionTrain: hasPopulatedTopLevel(docs, [LIGHT_RAIL_DOC_FIELDS.train]),
      showServiceTab: true,
      showAdminTab: true,
      showKnowledgebaseTab: catalogSchema.showKnowledgebaseTab,
      foldAdditionalIntoDetails: catalogSchema.foldAdditionalIntoDetails,
      stepFreeInDetails: catalogSchema.stepFreeInDetails,
      postEirCodeInLocation: catalogSchema.postEirCodeInLocation,
      showAdminUrlSlug: catalogSchema.showAdminUrlSlug,
      showTiploc: false,
      requireCrsCode: false,
      requireTiploc: false,
      stepFreeTabLabel: catalogSchema.stepFreeTabLabel,
      urlFieldKey: catalogSchema.urlFieldKey,
      urlFieldLabel: catalogSchema.urlFieldLabel,
    }
  }

  const force = profile
  const urlFieldKey: StationUrlFieldKey = catalogSchema.urlFieldKey
  // Routing slug (urlSlug) is Admin-only — never promote onto Details from station docs.
  // Public `url` fields (e.g. heritage) may still appear when present or forced.
  const showUrl =
    Boolean(force?.forceShowUrl) ||
    catalogSchema.showUrl ||
    (urlFieldKey === 'url' && hasPopulatedTopLevel(docs, ['url', 'urlSlug', 'url_slug']))
  const facilityKeysRaw = collectFacilityKeys(docs)
  const facilityKeysFiltered = force?.suppressKnowledgebaseOverlapFacilityKeys
    ? filterKnowledgebaseOverlapFacilityKeys(facilityKeysRaw)
    : facilityKeysRaw
  const facilityKeys = force?.suppressFacilitiesTab ? [] : facilityKeysFiltered
  const showToiletsSection =
    !force?.suppressFacilitiesTab &&
    !force?.suppressToiletsSection &&
    [...collectPopulatedNestedKeys(docs, 'toilets')].length > 0
  const showStepFreeSection =
    !force?.suppressStepFreeSection &&
    (Boolean(force?.forceShowStepFreeSection) ||
      [...collectPopulatedNestedKeys(docs, 'stepFree')].length > 0)
  const showStepFreeNote =
    !force?.suppressStepFreeNote &&
    !force?.suppressStepFreeSection &&
    hasPopulatedNested(docs, 'stepFree', 'stepFreeNote')
  const showLiftSection =
    !force?.suppressLiftSection && [...collectPopulatedNestedKeys(docs, 'lift')].length > 0
  // GBNR (stepFreeInDetails false): Step Free Status lives on the Step-free tab, so open that tab
  // whenever step-free or lift data exists. Heritage keeps step-free under Details.
  const showStepFreeTab = catalogSchema.stepFreeInDetails
    ? showLiftSection
    : showStepFreeSection || showLiftSection
  const showConnectionBus =
    !force?.suppressConnections && hasPopulatedNested(docs, 'connections', 'connectionBus')
  const showConnectionTaxi =
    !force?.suppressConnections && hasPopulatedNested(docs, 'connections', 'connectionTaxi')
  const showConnectionUnderground =
    !force?.suppressConnections && hasPopulatedNested(docs, 'connections', 'connectionUnderground')
  const showRequestStop =
    !force?.suppressServiceFlags &&
    (Boolean(force?.forceShowRequestStop) || hasPopulatedNested(docs, 'is', 'isrequeststop'))
  const showLimitedService =
    !force?.suppressServiceFlags && hasPopulatedNested(docs, 'is', 'Islimitedservice')
  const showStationStatusSection =
    !force?.suppressServiceFlags &&
    (Boolean(force?.forceShowStationStatusSection) ||
      hasPopulatedNested(docs, 'stationstatus', 'status') ||
      hasPopulatedNested(docs, 'stationstatus', 'operationalperiod'))
  const showStaffingLevel =
    !force?.suppressStaffingLevel &&
    (Boolean(force?.forceShowStaffingLevel) ||
      hasPopulatedTopLevel(docs, ['staffingLevel', 'staffing_level']))
  const showNlc =
    !force?.suppressNlc &&
    (Boolean(force?.forceShowNlc) || hasPopulatedTopLevel(docs, ['nlc', 'NLC']))
  const showGauge =
    Boolean(force?.forceShowGauge) || hasPopulatedTopLevel(docs, ['guage', 'Guage'])
  const showFacilitiesTab =
    !force?.suppressFacilitiesTab && (facilityKeys.length > 0 || showToiletsSection)
  const showMinConnectionTime =
    !force?.suppressMinConnectionTime &&
    hasPopulatedTopLevel(docs, ['min-connection-time', 'minConnectionTime'])

  const showUsageTab = docs.some((d) => {
    const yp = d.yearlyPassengers
    if (!yp || typeof yp !== 'object' || Array.isArray(yp)) return false
    return Object.values(yp as Record<string, unknown>).some((v) => !isEmpty(v))
  })

  return {
    isLightRail: false,
    defaultStnarea: catalogSchema.defaultStnarea,
    // Catalog `show*` floors keep empty optional rows stable on first paint; sampling can only add.
    showBorough:
      catalogSchema.showBorough ||
      hasPopulatedTopLevel(docs, BOROUGH_KEYS) ||
      hasPopulatedTopLevel(docs, ['londonBorough', 'london_borough']),
    showFareZone: catalogSchema.showFareZone || hasPopulatedTopLevel(docs, FARE_ZONE_KEYS),
    showOperatorCode:
      !force?.suppressOperatorCode &&
      (catalogSchema.showOperatorCode ||
        hasPopulatedTopLevel(docs, ['operatorCode', 'operator_code'])),
    showStaffingLevel,
    showNlc,
    showGauge: catalogSchema.showGauge || showGauge,
    showMinConnectionTime,
    showUrl,
    urlFieldKey,
    urlFieldLabel: catalogSchema.urlFieldLabel,
    showProvince: hasPopulatedTopLevel(docs, ['province']),
    showPostEirCode: hasPopulatedTopLevel(docs, ['post-eir_code']),
    postEirCodeInLocation: catalogSchema.postEirCodeInLocation,
    showUsageTab,
    foldAdditionalIntoDetails: catalogSchema.foldAdditionalIntoDetails,
    stepFreeInDetails: catalogSchema.stepFreeInDetails,
    showStepFreeSection,
    showStepFreeTab,
    showStepFreeNote,
    stepFreeTabLabel: catalogSchema.stepFreeTabLabel,
    showLiftSection,
    showToiletsSection,
    showFacilitiesTab,
    facilityKeys,
    showServiceTab:
      showConnectionBus ||
      showConnectionTaxi ||
      showConnectionUnderground ||
      showRequestStop ||
      showLimitedService ||
      showStationStatusSection ||
      showStaffingLevel,
    showKnowledgebaseTab: catalogSchema.showKnowledgebaseTab,
    showAdminTab: true,
    showAdminUrlSlug: catalogSchema.showAdminUrlSlug,
    showConnectionBus,
    showConnectionTaxi,
    showConnectionUnderground,
    showConnectionTrain: false,
    showLinesServed: false,
    showPlatforms: false,
    showDateOpened: false,
    showRequestStop,
    showLimitedService,
    showStationStatusSection,
    showTiploc: catalogSchema.showTiploc,
    requireCrsCode: catalogSchema.requireCrsCode,
    requireTiploc: catalogSchema.requireTiploc,
  }
}

/** OR show-* flags / union facility keys so a station doc can restore sections the catalog hides. */
export function mergeStationCollectionFieldSchemas(
  a: StationCollectionFieldSchema,
  b: StationCollectionFieldSchema
): StationCollectionFieldSchema {
  return {
    isLightRail: a.isLightRail || b.isLightRail,
    defaultStnarea: a.defaultStnarea || b.defaultStnarea,
    showBorough: a.showBorough || b.showBorough,
    showFareZone: a.showFareZone || b.showFareZone,
    showOperatorCode: a.showOperatorCode || b.showOperatorCode,
    showStaffingLevel: a.showStaffingLevel || b.showStaffingLevel,
    showNlc: a.showNlc || b.showNlc,
    showGauge: a.showGauge || b.showGauge,
    showMinConnectionTime: a.showMinConnectionTime || b.showMinConnectionTime,
    showUrl: a.showUrl || b.showUrl,
    urlFieldKey: a.showUrl ? a.urlFieldKey : b.urlFieldKey,
    urlFieldLabel: a.showUrl ? a.urlFieldLabel : b.urlFieldLabel,
    showProvince: a.showProvince || b.showProvince,
    showPostEirCode: a.showPostEirCode || b.showPostEirCode,
    postEirCodeInLocation: a.postEirCodeInLocation || b.postEirCodeInLocation,
    showUsageTab: a.showUsageTab || b.showUsageTab,
    foldAdditionalIntoDetails: a.foldAdditionalIntoDetails || b.foldAdditionalIntoDetails,
    stepFreeInDetails: a.stepFreeInDetails && b.stepFreeInDetails,
    showStepFreeSection: a.showStepFreeSection || b.showStepFreeSection,
    showStepFreeTab: a.showStepFreeTab || b.showStepFreeTab,
    showStepFreeNote: a.showStepFreeNote || b.showStepFreeNote,
    stepFreeTabLabel: a.showStepFreeTab ? a.stepFreeTabLabel : b.stepFreeTabLabel,
    showLiftSection: a.showLiftSection || b.showLiftSection,
    showToiletsSection: a.showToiletsSection || b.showToiletsSection,
    showFacilitiesTab: a.showFacilitiesTab || b.showFacilitiesTab,
    facilityKeys: [...new Set([...a.facilityKeys, ...b.facilityKeys])].sort(),
    showServiceTab: a.showServiceTab || b.showServiceTab,
    showKnowledgebaseTab: a.showKnowledgebaseTab || b.showKnowledgebaseTab,
    showAdminTab: a.showAdminTab || b.showAdminTab,
    showAdminUrlSlug: a.showAdminUrlSlug || b.showAdminUrlSlug,
    showConnectionBus: a.showConnectionBus || b.showConnectionBus,
    showConnectionTaxi: a.showConnectionTaxi || b.showConnectionTaxi,
    showConnectionUnderground: a.showConnectionUnderground || b.showConnectionUnderground,
    showConnectionTrain: a.showConnectionTrain || b.showConnectionTrain,
    showLinesServed: a.showLinesServed || b.showLinesServed,
    showPlatforms: a.showPlatforms || b.showPlatforms,
    showDateOpened: a.showDateOpened || b.showDateOpened,
    showRequestStop: a.showRequestStop || b.showRequestStop,
    showLimitedService: a.showLimitedService || b.showLimitedService,
    showStationStatusSection: a.showStationStatusSection || b.showStationStatusSection,
    showTiploc: a.showTiploc || b.showTiploc,
    requireCrsCode: a.requireCrsCode && b.requireCrsCode,
    requireTiploc: a.requireTiploc && b.requireTiploc,
  }
}

export function stationDetailsShowsAdditionalTab(fieldSchema: StationCollectionFieldSchema): boolean {
  if (fieldSchema.foldAdditionalIntoDetails) return false
  const showPostInAdditional =
    fieldSchema.showPostEirCode && !fieldSchema.postEirCodeInLocation
  return (
    fieldSchema.showOperatorCode ||
    fieldSchema.showMinConnectionTime ||
    fieldSchema.showProvince ||
    showPostInAdditional
  )
}

export function getVisibleStationDetailsTabs(fieldSchema: StationCollectionFieldSchema): StationDetailsTab[] {
  const tabs: StationDetailsTab[] = ['details']
  if (stationDetailsShowsAdditionalTab(fieldSchema)) tabs.push('additional')
  if (fieldSchema.showServiceTab) tabs.push('service')
  tabs.push('location')
  if (fieldSchema.showUsageTab) tabs.push('usage')
  if (fieldSchema.showStepFreeTab) tabs.push('stepFree')
  if (fieldSchema.showFacilitiesTab) tabs.push('facilities')
  if (fieldSchema.showAdminTab) tabs.push('admin')
  return tabs
}
