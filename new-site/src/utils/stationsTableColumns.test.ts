import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import {
  getTableColumnValue,
  resolveTableColumnsFromSlots,
  sortStationsByTableColumn,
  toggleTableSort,
} from './stationsTableColumns'
import {
  addTableColumnSlot,
  getAvailableTableColumnKeys,
  getDefaultTableColumnSlots,
  getTableFieldOptionLabelsForNetwork,
  getTableFieldSchemaForNetworkView,
  MAX_TABLE_COLUMN_SLOT_COUNT,
  STATIONS_TABLE_COLUMN_CATALOG,
} from './stationsTableColumnCatalog'

const baseStation = (overrides: Partial<Station> = {}): Station => ({
  id: '1',
  stationName: 'Alpha',
  crsCode: 'ALP',
  tiploc: null,
  latitude: 0,
  longitude: 0,
  country: 'England',
  county: 'Yorkshire',
  toc: 'Northern',
  stnarea: 'GBNR',
  yearlyPassengers: null,
  ...overrides,
})

describe('stationsTableColumns', () => {
  it('includes detail-page field options in the catalog', () => {
    expect(STATIONS_TABLE_COLUMN_CATALOG.length).toBeGreaterThan(30)
    expect(STATIONS_TABLE_COLUMN_CATALOG.some((entry) => entry.key === 'province')).toBe(true)
  })

  it('shows SYSupertram as TOC for SuperTram stops', () => {
    const station = baseStation({
      sourceCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
      stnarea: 'GBSHEFFSUPERTRAM',
      toc: null,
    })

    expect(getTableColumnValue(station, 'toc')).toBe('SYSupertram')
  })

  it('defaults to eight header slots on the all tab', () => {
    expect(getDefaultTableColumnSlots('all')).toEqual([
      { field: 'stnarea' },
      { field: 'id' },
      { field: 'name' },
      { field: 'crs' },
      { field: 'tiploc' },
      { field: 'locale' },
      { field: 'toc' },
      { field: 'lines' },
    ])
    expect(getDefaultTableColumnSlots('all').length).toBe(8)
  })

  it('defaults to six SuperTram header slots', () => {
    expect(getDefaultTableColumnSlots('lightrail_GBSHEFFSUPERTRAM')).toEqual([
      { field: 'id' },
      { field: 'name' },
      { field: 'locale' },
      { field: 'dateOpened' },
      { field: 'lines' },
      { field: 'platforms' },
    ])
  })

  it('defaults to five GB Heritage header slots', () => {
    expect(getDefaultTableColumnSlots('stations_gbheritage')).toEqual([
      { field: 'id' },
      { field: 'name' },
      { field: 'locale' },
      { field: 'toc' },
      { field: 'gauge' },
    ])
  })

  it('defaults to Irish Rail and NI Translink header slots with CRS first', () => {
    const expected = [
      { field: 'crs' },
      { field: 'name' },
      { field: 'locale' },
      { field: 'toc' },
    ]

    expect(getDefaultTableColumnSlots('stations_roiirerail')).toEqual(expected)
    expect(getDefaultTableColumnSlots('stations_nitranslink')).toEqual(expected)
  })

  it('defaults to seven GB National Rail header slots', () => {
    expect(getDefaultTableColumnSlots('stations_gbnr')).toEqual([
      { field: 'id' },
      { field: 'crs' },
      { field: 'name' },
      { field: 'locale' },
      { field: 'toc' },
      { field: 'fareZone' },
      { field: 'latestPassengers' },
    ])
  })

  it('can expand table slots up to eight columns', () => {
    let slots = getDefaultTableColumnSlots('all')

    slots = addTableColumnSlot(slots)
    slots = addTableColumnSlot(slots)
    slots = addTableColumnSlot(slots)

    expect(slots).toHaveLength(8)
    expect(new Set(slots.map((slot) => slot.field)).size).toBe(8)
    expect(addTableColumnSlot(slots)).toHaveLength(MAX_TABLE_COLUMN_SLOT_COUNT)
  })

  it('resolves assigned header slots in order', () => {
    const columns = resolveTableColumnsFromSlots([
      { field: 'name' },
      { field: 'network' },
      { field: 'id' },
      { field: 'toc' },
      { field: 'crs' },
    ])

    expect(columns.map((column) => column.key)).toEqual(['name', 'network', 'id', 'toc', 'crs'])
    expect(columns.map((column) => column.slotIndex)).toEqual([0, 1, 2, 3, 4])
  })

  it('sorts numeric ids ascending', () => {
    const stations = [
      baseStation({ id: '12', stationName: 'B' }),
      baseStation({ id: '2', stationName: 'A' }),
      baseStation({ id: '10', stationName: 'C' }),
    ]

    const sorted = sortStationsByTableColumn(stations, { column: 'id', direction: 'asc' })
    expect(sorted.map((station) => station.id)).toEqual(['2', '10', '12'])
  })

  it('sorts date opened oldest to newest ascending', () => {
    const stations = [
      baseStation({ id: '1', dateOpened: '15/03/1995' }),
      baseStation({ id: '2', dateOpened: '01/01/1994' }),
      baseStation({ id: '3', dateOpened: '22/11/2002' }),
    ]

    const sorted = sortStationsByTableColumn(stations, { column: 'dateOpened', direction: 'asc' })
    expect(sorted.map((station) => station.dateOpened)).toEqual([
      '01/01/1994',
      '15/03/1995',
      '22/11/2002',
    ])
  })

  it('hides stations with no data when sorting by a passenger year column', () => {
    const stations = [
      baseStation({
        id: '1',
        stationName: 'Has 2023',
        yearlyPassengers: { '2023': 1000 },
        sourceCollectionId: 'stations_gbnr',
      }),
      baseStation({
        id: '2',
        stationName: 'Missing 2023',
        yearlyPassengers: { '2022': 500 },
        sourceCollectionId: 'stations_gbnr',
      }),
      baseStation({
        id: '3',
        stationName: 'Null 2023',
        yearlyPassengers: { '2023': null },
        sourceCollectionId: 'stations_gbnr',
      }),
      baseStation({
        id: '4',
        stationName: 'Higher 2023',
        yearlyPassengers: { '2023': 5000 },
        sourceCollectionId: 'stations_gbnr',
      }),
    ]

    const sorted = sortStationsByTableColumn(stations, {
      column: 'passengers:2023',
      direction: 'desc',
    })

    expect(sorted.map((station) => station.id)).toEqual(['4', '1'])
  })

  it('ties date opened sort with order of opening within the same date', () => {
    const stations = [
      baseStation({
        id: '3',
        stationName: 'Carbrook for IKEA',
        dateOpened: '21/03/1994',
        orderOfOpening: 3,
      }),
      baseStation({
        id: '1',
        stationName: 'Meadowhall Interchange',
        dateOpened: '21/03/1994',
        orderOfOpening: 1,
      }),
      baseStation({
        id: '2',
        stationName: 'Meadowhall South/Tinsley',
        dateOpened: '21/03/1994',
        orderOfOpening: 2,
      }),
      baseStation({
        id: '4',
        stationName: 'Arbourthorne Road',
        dateOpened: '22/08/1994',
        orderOfOpening: 4,
      }),
    ]

    const asc = sortStationsByTableColumn(stations, { column: 'dateOpened', direction: 'asc' })
    expect(asc.map((station) => station.id)).toEqual(['1', '2', '3', '4'])

    const desc = sortStationsByTableColumn(stations, { column: 'dateOpened', direction: 'desc' })
    expect(desc.map((station) => station.id)).toEqual(['4', '3', '2', '1'])
  })

  it('toggles sort direction when clicking the same column', () => {
    expect(toggleTableSort({ column: 'name', direction: 'asc' }, 'name')).toEqual({
      column: 'name',
      direction: 'desc',
    })
  })

  it('reads extended detail fields', () => {
    const station = baseStation({ operatorCode: 'NT', province: 'Ulster' })
    expect(getTableColumnValue(station, 'operatorCode')).toBe('NT')
    expect(getTableColumnValue(station, 'province')).toBe('Ulster')
  })

  it('reads latest passengers from string and null yearly values', () => {
    const station = baseStation({
      yearlyPassengers: { '2024': null, '2023': 12345 },
    })

    expect(getTableColumnValue(station, 'latestPassengers')).toBe('12345')
  })

  it('formats all yearly passengers newest first', () => {
    const station = baseStation({
      yearlyPassengers: { '2022': 1000, '2024': null, '2023': 2500 },
    })

    expect(getTableColumnValue(station, 'passengers:2023')).toBe('2500')
    expect(getTableColumnValue(station, 'passengers:2022')).toBe('1000')
    expect(getTableColumnValue(station, 'passengers:2024')).toBe('')
  })

  it('expands yearly passengers slot into one column per year', () => {
    const columns = resolveTableColumnsFromSlots([{ field: 'name' }, { field: 'yearlyPassengers' }], {
      passengerYears: ['2024', '2023'],
    })

    expect(columns.map((column) => column.key)).toEqual(['name', 'passengers:2024', 'passengers:2023'])
    expect(columns.map((column) => column.label)).toEqual(['Station name', '2024', '2023'])
  })

  it('formats locale for GB stations to match card layout', () => {
    const station = baseStation({
      country: 'England',
      county: 'South Yorkshire',
      borough: 'Park Hill',
    })

    expect(getTableColumnValue(station, 'locale')).toBe('Park Hill, South Yorkshire, England')
  })

  it('formats locale for Irish Rail stations to match card layout', () => {
    const station = baseStation({
      country: 'Ireland',
      county: 'Cork',
      sourceCollectionId: 'stations_roiirerail',
    })

    expect(getTableColumnValue(station, 'locale')).toBe('Munster, Cork, Ireland')
  })
})

describe('stationsTableColumnCatalog network filters', () => {
  it('shows locale instead of separate location fields on the all network tab', () => {
    const labels = getTableFieldOptionLabelsForNetwork(
      'all',
      getTableFieldSchemaForNetworkView('all')
    )

    expect(labels).toContain('Network')
    expect(labels).toContain('Locale')
    expect(labels).toContain('CRS code')
    expect(labels).toContain('Lines served')
    expect(labels).not.toContain('Country')
    expect(labels).not.toContain('County')
    expect(labels).not.toContain('Borough')
    expect(labels).not.toContain('Province')
    expect(labels).not.toContain('Operator code')
    expect(labels).not.toContain('Post / Eircode')
    expect(labels.length).toBe(STATIONS_TABLE_COLUMN_CATALOG.length - 6)
  })

  it('aligns GB National Rail assign headers with non-Knowledgebase detail fields', () => {
    const schema = getTableFieldSchemaForNetworkView('stations_gbnr')
    const keys = getAvailableTableColumnKeys('stations_gbnr', schema)

    // Firebase detail fields (not Knowledgebase).
    expect(keys).toContain('locale')
    expect(keys).toContain('crs')
    expect(keys).toContain('tiploc')
    expect(keys).toContain('toc')
    expect(keys).toContain('fareZone')
    expect(keys).toContain('latestPassengers')
    expect(keys).toContain('yearlyPassengers')
    expect(keys).toContain('latitude')
    expect(keys).toContain('longitude')
    expect(keys).toContain('stnarea')

    // Location chips are combined into Locale.
    expect(keys).not.toContain('country')
    expect(keys).not.toContain('county')
    expect(keys).not.toContain('borough')
    expect(keys).not.toContain('province')

    // Knowledgebase-covered Firebase fields stay out of Assign Headers.
    expect(keys).not.toContain('nlc')
    expect(keys).not.toContain('operatorCode')
    expect(keys).not.toContain('staffingLevel')
    expect(keys).not.toContain('stepFreeStatus')
    expect(keys).not.toContain('stepFreeNote')
    expect(keys).not.toContain('liftAvailable')
    expect(keys).not.toContain('liftNotes')
    expect(keys).not.toContain('liftDetails')
    expect(keys).not.toContain('connectionBus')
    expect(keys).not.toContain('connectionTaxi')
    expect(keys).not.toContain('connectionUnderground')
    expect(keys).not.toContain('toiletsAccessible')
    expect(keys).not.toContain('toiletsChangingPlace')
    expect(keys).not.toContain('toiletsBabyChanging')
    expect(keys).not.toContain('minConnectionTime')
    expect(keys).not.toContain('requestStop')
    expect(keys).not.toContain('limitedService')
    expect(keys).not.toContain('stationStatus')
    expect(keys).not.toContain('operationalPeriod')
  })

  it('aligns Irish Rail / NI Translink assign headers with lean regional detail fields', () => {
    for (const network of ['stations_roiirerail', 'stations_nitranslink'] as const) {
      const schema = getTableFieldSchemaForNetworkView(network)
      const keys = getAvailableTableColumnKeys(network, schema)

      expect(keys).toContain('locale')
      expect(keys).toContain('crs')
      expect(keys).toContain('toc')
      expect(keys).not.toContain('operatorCode')
      expect(keys).not.toContain('postEirCode')
      expect(keys).not.toContain('tiploc')
      expect(keys).not.toContain('fareZone')
      expect(keys).not.toContain('province')
      expect(keys).not.toContain('county')
      expect(keys).not.toContain('latestPassengers')
      expect(keys).not.toContain('yearlyPassengers')
    }
  })

  it('hides rail-only fields on the SuperTram tab', () => {
    const schema = getTableFieldSchemaForNetworkView('lightrail_GBSHEFFSUPERTRAM')
    const keys = getAvailableTableColumnKeys('lightrail_GBSHEFFSUPERTRAM', schema)

    expect(keys).toContain('locale')
    expect(keys).toContain('lines')
    expect(keys).toContain('platforms')
    expect(keys).toContain('fareZone')
    expect(keys).toContain('dateOpened')
    expect(keys).toContain('orderOfOpening')
    expect(keys).toContain('hasLift')
    expect(keys).toContain('stepFreeStatus')
    expect(keys).toContain('staffed')
    expect(keys).toContain('connectionBus')
    expect(keys).toContain('connectionTrain')
    expect(keys).toContain('limitedService')
    expect(keys).not.toContain('country')
    expect(keys).not.toContain('borough')
    expect(keys).not.toContain('crs')
    expect(keys).not.toContain('toc')
    expect(keys).not.toContain('tiploc')
    expect(keys).not.toContain('network')
    expect(keys).not.toContain('liftAvailable')
    expect(keys).not.toContain('liftNotes')
    expect(keys).not.toContain('liftDetails')
    expect(keys).not.toContain('staffingLevel')
    expect(keys).not.toContain('latestPassengers')
    expect(keys).not.toContain('yearlyPassengers')
  })

  it('hides SuperTram admin-only assign-header fields when admin mode is off', () => {
    const schema = getTableFieldSchemaForNetworkView('lightrail_GBSHEFFSUPERTRAM')
    const keys = getAvailableTableColumnKeys('lightrail_GBSHEFFSUPERTRAM', schema, {
      isAdminMode: false,
    })

    expect(keys).toContain('name')
    expect(keys).toContain('locale')
    expect(keys).toContain('dateOpened')
    expect(keys).toContain('lines')
    expect(keys).not.toContain('id')
    expect(keys).not.toContain('stnarea')
    expect(keys).not.toContain('fareZone')
    expect(keys).not.toContain('orderOfOpening')
  })

  it('hides Station ID, Station area, and Fare zone on every network when admin mode is off', () => {
    const networks = [
      'all',
      'stations_gbnr',
      'stations_roiirerail',
      'stations_nitranslink',
      'stations_gbheritage',
      'lightrail_GBSHEFFSUPERTRAM',
    ] as const

    for (const network of networks) {
      const schema = getTableFieldSchemaForNetworkView(network)
      const keys = getAvailableTableColumnKeys(network, schema, { isAdminMode: false })

      expect(keys).not.toContain('id')
      expect(keys).not.toContain('stnarea')
      expect(keys).not.toContain('fareZone')
    }

    const gbnrAdminOn = getAvailableTableColumnKeys(
      'stations_gbnr',
      getTableFieldSchemaForNetworkView('stations_gbnr'),
      { isAdminMode: true }
    )
    expect(gbnrAdminOn).toContain('id')
    expect(gbnrAdminOn).toContain('stnarea')
    expect(gbnrAdminOn).toContain('fareZone')
  })

  it('uses province locale format on Irish Rail tab options', () => {
    const schema = getTableFieldSchemaForNetworkView('stations_roiirerail')
    const keys = getAvailableTableColumnKeys('stations_roiirerail', schema)

    expect(keys).toContain('locale')
    expect(keys).not.toContain('province')
    expect(keys).not.toContain('county')
  })
})

