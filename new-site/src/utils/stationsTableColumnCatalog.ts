import { LIGHT_RAIL_DOC_FIELDS } from './lightRailStationFields'
import type { NetworkViewFilter } from '../constants/stationCollections'
import {
  inferStationCollectionFieldSchema,
  type StationCollectionFieldSchema,
} from './stationCollectionFieldSchema'

export type StationsTableColumnKey =
  | 'id'
  | 'name'
  | 'crs'
  | 'tiploc'
  | 'toc'
  | 'country'
  | 'county'
  | 'locale'
  | 'stnarea'
  | 'borough'
  | 'fareZone'
  | 'lines'
  | 'platforms'
  | 'nlc'
  | 'gauge'
  | 'url'
  | 'latitude'
  | 'longitude'
  | 'operatorCode'
  | 'minConnectionTime'
  | 'province'
  | 'postEirCode'
  | 'stepFreeStatus'
  | 'stepFreeNote'
  | 'hasLift'
  | 'liftAvailable'
  | 'liftNotes'
  | 'liftDetails'
  | 'dateOpened'
  | 'orderOfOpening'
  | 'limitedService'
  | 'staffed'
  | 'staffingLevel'
  | 'connectionBus'
  | 'connectionTaxi'
  | 'connectionUnderground'
  | 'connectionTrain'
  | 'stationStatus'
  | 'operationalPeriod'
  | 'requestStop'
  | 'toiletsAccessible'
  | 'toiletsChangingPlace'
  | 'toiletsBabyChanging'
  | 'latestPassengers'
  /** Assign Headers option — expands to one column per year at render time. */
  | 'yearlyPassengers'
  /** Resolved year column, e.g. passengers:2024 */
  | `passengers:${string}`
  | 'network'

/** Keys that can appear in Assign Headers slots (not expanded year columns). */
export type StationsTableCatalogColumnKey = Exclude<StationsTableColumnKey, `passengers:${string}`>

export type StationsTableColumnSortMode = 'numeric' | 'text' | 'date'

export interface StationsTableColumnCatalogEntry {
  key: StationsTableCatalogColumnKey
  defaultLabel: string
  sortMode: StationsTableColumnSortMode
  cellClassName?: string
  renderAsLinesChips?: boolean
}

export interface StationsTableColumnSlot {
  field: StationsTableCatalogColumnKey
}

export const DEFAULT_TABLE_COLUMN_SLOT_COUNT = 5
export const MAX_TABLE_COLUMN_SLOT_COUNT = 8

const LOCALE_COMBINED_COLUMN_KEYS = new Set<StationsTableColumnKey>([
  'country',
  'county',
  'borough',
  'province',
])

/** Never offered in Assign Headers (detail-only / not useful as list columns). */
const ASSIGN_HEADERS_EXCLUDED_COLUMN_KEYS = new Set<StationsTableColumnKey>([
  'operatorCode',
  'postEirCode',
])

/** Fields shown in Assign Headers only while admin mode is on (all networks). */
const ADMIN_ONLY_TABLE_COLUMN_KEYS = new Set<StationsTableColumnKey>([
  'id',
  'stnarea',
  'fareZone',
  /** SuperTram opening sequence — admin-only when that network offers it. */
  'orderOfOpening',
])

export type AvailableTableColumnOptions = {
  isAdminMode?: boolean
}

export const STATIONS_TABLE_COLUMN_CATALOG: StationsTableColumnCatalogEntry[] = [
  { key: 'id', defaultLabel: 'Station ID', sortMode: 'numeric', cellClassName: 'stations-table__id' },
  { key: 'name', defaultLabel: 'Station name', sortMode: 'text', cellClassName: 'stations-table__name' },
  { key: 'crs', defaultLabel: 'CRS code', sortMode: 'text' },
  { key: 'tiploc', defaultLabel: 'TIPLOC', sortMode: 'text' },
  { key: 'toc', defaultLabel: 'TOC', sortMode: 'text' },
  { key: 'country', defaultLabel: 'Country', sortMode: 'text' },
  { key: 'county', defaultLabel: 'County', sortMode: 'text' },
  { key: 'locale', defaultLabel: 'Locale', sortMode: 'text', cellClassName: 'stations-table__locale' },
  { key: 'stnarea', defaultLabel: 'Station area', sortMode: 'text' },
  { key: 'borough', defaultLabel: 'Borough', sortMode: 'text' },
  { key: 'fareZone', defaultLabel: 'Fare zone', sortMode: 'numeric' },
  { key: 'lines', defaultLabel: 'Lines served', sortMode: 'text', renderAsLinesChips: true },
  { key: 'platforms', defaultLabel: 'Platforms', sortMode: 'text' },
  { key: 'nlc', defaultLabel: 'NLC', sortMode: 'text' },
  { key: 'gauge', defaultLabel: 'Gauge', sortMode: 'text' },
  { key: 'url', defaultLabel: 'URL', sortMode: 'text' },
  { key: 'latitude', defaultLabel: 'Latitude', sortMode: 'numeric' },
  { key: 'longitude', defaultLabel: 'Longitude', sortMode: 'numeric' },
  { key: 'operatorCode', defaultLabel: 'Operator code', sortMode: 'text' },
  { key: 'minConnectionTime', defaultLabel: 'Min connection time', sortMode: 'numeric' },
  { key: 'province', defaultLabel: 'Province', sortMode: 'text' },
  { key: 'postEirCode', defaultLabel: 'Post / Eircode', sortMode: 'text' },
  { key: 'stepFreeStatus', defaultLabel: 'Step free status', sortMode: 'text' },
  { key: 'stepFreeNote', defaultLabel: 'Step free note', sortMode: 'text' },
  { key: 'hasLift', defaultLabel: 'Has lift', sortMode: 'text' },
  { key: 'liftAvailable', defaultLabel: 'Lift available', sortMode: 'text' },
  { key: 'liftNotes', defaultLabel: 'Lift notes', sortMode: 'text' },
  { key: 'liftDetails', defaultLabel: 'Lift details', sortMode: 'text' },
  { key: 'dateOpened', defaultLabel: 'Date opened', sortMode: 'date' },
  { key: 'orderOfOpening', defaultLabel: 'Order of opening', sortMode: 'numeric' },
  { key: 'limitedService', defaultLabel: 'Limited service', sortMode: 'text' },
  { key: 'staffed', defaultLabel: 'Staffed', sortMode: 'text' },
  { key: 'staffingLevel', defaultLabel: 'Staffing level', sortMode: 'text' },
  { key: 'connectionBus', defaultLabel: 'Bus connection', sortMode: 'text' },
  { key: 'connectionTaxi', defaultLabel: 'Taxi connection', sortMode: 'text' },
  { key: 'connectionUnderground', defaultLabel: 'Underground connection', sortMode: 'text' },
  { key: 'connectionTrain', defaultLabel: 'Train connection', sortMode: 'text' },
  { key: 'stationStatus', defaultLabel: 'Status', sortMode: 'text' },
  { key: 'operationalPeriod', defaultLabel: 'Operational period', sortMode: 'text' },
  { key: 'requestStop', defaultLabel: 'Request stop', sortMode: 'text' },
  { key: 'toiletsAccessible', defaultLabel: 'Toilets accessible', sortMode: 'text' },
  { key: 'toiletsChangingPlace', defaultLabel: 'Changing place', sortMode: 'text' },
  { key: 'toiletsBabyChanging', defaultLabel: 'Baby changing', sortMode: 'text' },
  { key: 'latestPassengers', defaultLabel: 'Latest passengers', sortMode: 'numeric' },
  {
    key: 'yearlyPassengers',
    defaultLabel: 'Yearly passengers',
    sortMode: 'numeric',
  },
  { key: 'network', defaultLabel: 'Network', sortMode: 'text' },
]

export const STATIONS_TABLE_COLUMN_CATALOG_BY_KEY = Object.fromEntries(
  STATIONS_TABLE_COLUMN_CATALOG.map((entry) => [entry.key, entry])
) as Record<StationsTableCatalogColumnKey, StationsTableColumnCatalogEntry>

const PASSENGER_YEAR_COLUMN_KEY_PATTERN = /^passengers:(\d{4})$/

export function isPassengerYearColumnKey(
  key: string
): key is `passengers:${string}` {
  return PASSENGER_YEAR_COLUMN_KEY_PATTERN.test(key)
}

export function makePassengerYearColumnKey(year: string): `passengers:${string}` {
  return `passengers:${year}`
}

export function getYearFromPassengerYearColumnKey(key: `passengers:${string}`): string {
  return key.slice('passengers:'.length)
}

const DEFAULT_TABLE_COLUMN_SLOTS: StationsTableColumnSlot[] = [
  { field: 'stnarea' },
  { field: 'id' },
  { field: 'name' },
  { field: 'crs' },
  { field: 'tiploc' },
  { field: 'locale' },
  { field: 'toc' },
  { field: 'lines' },
]

const SUPERTRAM_DEFAULT_TABLE_COLUMN_SLOTS: StationsTableColumnSlot[] = [
  { field: 'id' },
  { field: 'name' },
  { field: 'locale' },
  { field: 'dateOpened' },
  { field: 'lines' },
  { field: 'platforms' },
]

const GB_HERITAGE_DEFAULT_TABLE_COLUMN_SLOTS: StationsTableColumnSlot[] = [
  { field: 'id' },
  { field: 'name' },
  { field: 'locale' },
  { field: 'toc' },
  { field: 'gauge' },
]

const IRISH_RAIL_DEFAULT_TABLE_COLUMN_SLOTS: StationsTableColumnSlot[] = [
  { field: 'crs' },
  { field: 'name' },
  { field: 'locale' },
  { field: 'toc' },
]

const GB_NATIONAL_RAIL_DEFAULT_TABLE_COLUMN_SLOTS: StationsTableColumnSlot[] = [
  { field: 'id' },
  { field: 'crs' },
  { field: 'name' },
  { field: 'locale' },
  { field: 'toc' },
  { field: 'fareZone' },
  { field: 'latestPassengers' },
]

const DEFAULT_TABLE_COLUMN_SLOTS_BY_NETWORK: Partial<
  Record<Exclude<NetworkViewFilter, 'all'>, StationsTableColumnSlot[]>
> = {
  stations_gbnr: GB_NATIONAL_RAIL_DEFAULT_TABLE_COLUMN_SLOTS,
  stations_gbheritage: GB_HERITAGE_DEFAULT_TABLE_COLUMN_SLOTS,
  stations_nitranslink: IRISH_RAIL_DEFAULT_TABLE_COLUMN_SLOTS,
  stations_roiirerail: IRISH_RAIL_DEFAULT_TABLE_COLUMN_SLOTS,
  lightrail_GBSHEFFSUPERTRAM: SUPERTRAM_DEFAULT_TABLE_COLUMN_SLOTS,
}

export function getDefaultTableColumnSlots(
  networkView: NetworkViewFilter = 'all'
): StationsTableColumnSlot[] {
  const slots =
    networkView === 'all'
      ? DEFAULT_TABLE_COLUMN_SLOTS
      : DEFAULT_TABLE_COLUMN_SLOTS_BY_NETWORK[networkView] ?? DEFAULT_TABLE_COLUMN_SLOTS

  return slots.map((slot) => ({ ...slot }))
}

export function getAvailableTableColumnKeys(
  networkView: NetworkViewFilter,
  fieldSchema: StationCollectionFieldSchema,
  options: AvailableTableColumnOptions = {}
): StationsTableCatalogColumnKey[] {
  const isAdminMode = options.isAdminMode !== false

  let keys: StationsTableCatalogColumnKey[]

  if (networkView === 'all') {
    keys = STATIONS_TABLE_COLUMN_CATALOG.filter(
      (entry) =>
        !LOCALE_COMBINED_COLUMN_KEYS.has(entry.key) &&
        !ASSIGN_HEADERS_EXCLUDED_COLUMN_KEYS.has(entry.key)
    ).map((entry) => entry.key)
  } else {
    keys = [
      'id',
      'name',
      'locale',
      'stnarea',
      'latitude',
      'longitude',
    ]

    if (!fieldSchema.isLightRail) {
      keys.push('crs', 'toc')
      if (fieldSchema.showTiploc) keys.push('tiploc')
    }

    if (fieldSchema.showFareZone) keys.push('fareZone')
    if (fieldSchema.showLinesServed) keys.push('lines')
    if (fieldSchema.showPlatforms) keys.push('platforms')
    if (fieldSchema.showNlc) keys.push('nlc')
    if (fieldSchema.showGauge) keys.push('gauge')
    if (fieldSchema.showUrl) keys.push('url')
    if (fieldSchema.showMinConnectionTime) keys.push('minConnectionTime')

    if (fieldSchema.showStepFreeSection) {
      keys.push('stepFreeStatus')
      if (fieldSchema.isLightRail) keys.push('hasLift')
    }
    if (fieldSchema.showStepFreeNote) keys.push('stepFreeNote')
    // SuperTram uses a single Has Lift field; nested lift available/notes/details are heavy-rail only.
    if (fieldSchema.showLiftSection && !fieldSchema.isLightRail) {
      keys.push('liftAvailable', 'liftNotes', 'liftDetails')
    }

    if (fieldSchema.showDateOpened) keys.push('dateOpened')
    if (fieldSchema.showOrderOfOpening) keys.push('orderOfOpening')
    if (fieldSchema.showLimitedService) keys.push('limitedService')

    if (fieldSchema.isLightRail && fieldSchema.showStaffingLevel) {
      keys.push('staffed')
    } else if (fieldSchema.showStaffingLevel) {
      keys.push('staffingLevel')
    }

    if (fieldSchema.showConnectionBus) keys.push('connectionBus')
    if (fieldSchema.showConnectionTaxi) keys.push('connectionTaxi')
    if (fieldSchema.showConnectionUnderground) keys.push('connectionUnderground')
    if (fieldSchema.showConnectionTrain) keys.push('connectionTrain')

    if (fieldSchema.showStationStatusSection) {
      keys.push('stationStatus', 'operationalPeriod')
    }
    if (fieldSchema.showRequestStop) keys.push('requestStop')

    if (fieldSchema.showToiletsSection) {
      keys.push('toiletsAccessible', 'toiletsChangingPlace', 'toiletsBabyChanging')
    }

    if (fieldSchema.showUsageTab) {
      keys.push('latestPassengers', 'yearlyPassengers')
    }
  }

  if (!isAdminMode) {
    return keys.filter((key) => !ADMIN_ONLY_TABLE_COLUMN_KEYS.has(key))
  }

  return keys
}

export function filterTableColumnSlotsToAllowedKeys(
  slots: StationsTableColumnSlot[],
  allowedKeys: StationsTableCatalogColumnKey[]
): StationsTableColumnSlot[] {
  const allowed = new Set(allowedKeys)
  return slots.filter((slot) => allowed.has(slot.field))
}

export function getTableFieldOptionLabelsForNetwork(
  networkView: NetworkViewFilter,
  fieldSchema: StationCollectionFieldSchema,
  options: AvailableTableColumnOptions = {}
): string[] {
  const allowedKeys = new Set(getAvailableTableColumnKeys(networkView, fieldSchema, options))
  return STATIONS_TABLE_COLUMN_CATALOG.filter((entry) => allowedKeys.has(entry.key)).map(
    (entry) => entry.defaultLabel
  )
}

export function getTableFieldSchemaForNetworkView(networkView: NetworkViewFilter): StationCollectionFieldSchema {
  if (networkView === 'all') {
    return inferStationCollectionFieldSchema([], 'stations_gbnr')
  }
  return inferStationCollectionFieldSchema([], networkView)
}

export function getSuggestedTableColumnField(
  usedFields: StationsTableCatalogColumnKey[],
  allowedFields?: StationsTableCatalogColumnKey[]
): StationsTableCatalogColumnKey {
  const catalog = allowedFields
    ? STATIONS_TABLE_COLUMN_CATALOG.filter((entry) => allowedFields.includes(entry.key))
    : STATIONS_TABLE_COLUMN_CATALOG
  const unused = catalog.find((entry) => !usedFields.includes(entry.key))
  return unused?.key ?? catalog[0]?.key ?? 'name'
}

export function addTableColumnSlot(
  slots: StationsTableColumnSlot[],
  allowedFields?: StationsTableCatalogColumnKey[]
): StationsTableColumnSlot[] {
  if (slots.length >= MAX_TABLE_COLUMN_SLOT_COUNT) return slots

  const usedFields = slots.map((slot) => slot.field)
  return [...slots, { field: getSuggestedTableColumnField(usedFields, allowedFields) }]
}

export function removeTableColumnSlot(slots: StationsTableColumnSlot[]): StationsTableColumnSlot[] {
  if (slots.length <= DEFAULT_TABLE_COLUMN_SLOT_COUNT) return slots
  return slots.slice(0, -1)
}

export function getTableFieldOptionLabels(): string[] {
  return STATIONS_TABLE_COLUMN_CATALOG.map((entry) => entry.defaultLabel)
}

export function getTableFieldKeyFromLabel(label: string): StationsTableCatalogColumnKey | null {
  const match = STATIONS_TABLE_COLUMN_CATALOG.find((entry) => entry.defaultLabel === label)
  return match?.key ?? null
}

export function getTableFieldLabel(field: StationsTableColumnKey): string {
  if (isPassengerYearColumnKey(field)) {
    return getYearFromPassengerYearColumnKey(field)
  }
  return STATIONS_TABLE_COLUMN_CATALOG_BY_KEY[field].defaultLabel
}

function readFirestoreString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key]
    if (value != null && String(value).trim() !== '') return String(value).trim()
  }
  return null
}

function readFirestoreNestedString(
  data: Record<string, unknown>,
  parent: string,
  child: string
): string | null {
  const nested = data[parent]
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return null
  const value = (nested as Record<string, unknown>)[child]
  if (value == null || String(value).trim() === '') return null
  return String(value).trim()
}

export function mapStationDetailFieldsFromFirestore(
  data: Record<string, unknown>
): Partial<import('../types').Station> {
  return {
    platforms: readFirestoreString(data, LIGHT_RAIL_DOC_FIELDS.platforms, 'Platforms'),
    operatorCode: readFirestoreString(data, 'operatorCode', 'operator_code'),
    staffingLevel: readFirestoreString(data, 'staffingLevel', 'staffing_level'),
    nlc: readFirestoreString(data, 'nlc', 'NLC'),
    gauge: readFirestoreString(data, 'guage', 'Guage'),
    minConnectionTime: readFirestoreString(data, 'min-connection-time', 'minConnectionTime'),
    province: readFirestoreString(data, 'province', 'Province'),
    postEirCode: readFirestoreString(data, 'post-eir_code'),
    stepFreeCode:
      readFirestoreString(data, LIGHT_RAIL_DOC_FIELDS.isStepFree, 'IsStepFree')
      ?? readFirestoreNestedString(data, 'stepFree', 'stepFreeCode'),
    stepFreeNote: readFirestoreNestedString(data, 'stepFree', 'stepFreeNote'),
    hasLift: readFirestoreString(data, LIGHT_RAIL_DOC_FIELDS.hasLift, 'HasLift'),
    liftAvailable: readFirestoreNestedString(data, 'lift', 'liftAvailable'),
    liftNotes: readFirestoreNestedString(data, 'lift', 'liftNotes'),
    liftDetails: readFirestoreNestedString(data, 'lift', 'liftDetails'),
    isLimitedService:
      readFirestoreString(data, LIGHT_RAIL_DOC_FIELDS.isLimitedService, 'IsLimitedService')
      ?? readFirestoreNestedString(data, 'is', 'Islimitedservice'),
    isStaffed: readFirestoreString(data, LIGHT_RAIL_DOC_FIELDS.isStaffed, 'IsStaffed'),
    connectionBus:
      readFirestoreString(data, LIGHT_RAIL_DOC_FIELDS.bus, 'Bus')
      ?? readFirestoreNestedString(data, 'connections', 'connectionBus'),
    connectionTaxi: readFirestoreNestedString(data, 'connections', 'connectionTaxi'),
    connectionUnderground: readFirestoreNestedString(data, 'connections', 'connectionUnderground'),
    connectionTrain: readFirestoreString(data, LIGHT_RAIL_DOC_FIELDS.train, 'Train'),
    stationStatus: readFirestoreNestedString(data, 'stationstatus', 'status'),
    operationalPeriod: readFirestoreNestedString(data, 'stationstatus', 'operationalperiod'),
    requestStop: readFirestoreNestedString(data, 'is', 'isrequeststop'),
    toiletsAccessible: readFirestoreNestedString(data, 'toilets', 'toiletsAccessible'),
    toiletsChangingPlace: readFirestoreNestedString(data, 'toilets', 'toiletsChangingPlace'),
    toiletsBabyChanging: readFirestoreNestedString(data, 'toilets', 'toiletsBabyChanging'),
  }
}
