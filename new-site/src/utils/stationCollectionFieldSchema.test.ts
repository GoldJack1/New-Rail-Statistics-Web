import { describe, expect, it } from 'vitest'

import { NETWORK_COLLECTION_IDS } from '../constants/stationCollections'
import { STATION_DETAIL_LAYOUT_PROFILES } from '../constants/stationDetailLayoutProfiles'
import { inferStationCollectionFieldSchema, getVisibleStationDetailsTabs, stationDetailsShowsAdditionalTab } from './stationCollectionFieldSchema'

describe('inferStationCollectionFieldSchema from layout profiles', () => {
  it('has a layout profile for every network', () => {
    for (const id of NETWORK_COLLECTION_IDS) {
      expect(STATION_DETAIL_LAYOUT_PROFILES[id]).toBeDefined()
      expect(STATION_DETAIL_LAYOUT_PROFILES[id].networkName.length).toBeGreaterThan(0)
    }
  })

  it('matches heritage catalog empty-doc defaults', () => {
    const schema = inferStationCollectionFieldSchema([], 'stations_gbheritage')
    expect(schema.showUrl).toBe(true)
    expect(schema.urlFieldKey).toBe('url')
    expect(schema.requireCrsCode).toBe(false)
    expect(schema.requireTiploc).toBe(false)
    expect(schema.showNlc).toBe(true)
    expect(schema.showGauge).toBe(true)
    expect(schema.showServiceTab).toBe(true)
    expect(schema.showStepFreeSection).toBe(true)
    expect(schema.isLightRail).toBe(false)
  })

  it('matches mainline catalog empty-doc defaults', () => {
    const schema = inferStationCollectionFieldSchema([], 'stations_gbnr')
    expect(schema.requireCrsCode).toBe(true)
    expect(schema.requireTiploc).toBe(true)
    // Optional detail rows stay visible from first paint (avoids sample-load flicker).
    expect(schema.showBorough).toBe(true)
    expect(schema.showFareZone).toBe(true)
    expect(schema.showUrl).toBe(false)
    expect(schema.isLightRail).toBe(false)
    expect(getVisibleStationDetailsTabs(schema)).not.toContain('knowledgebase')
  })

  it('matches SuperTram catalog empty-doc defaults', () => {
    const schema = inferStationCollectionFieldSchema([], 'lightrail_GBSHEFFSUPERTRAM')
    expect(schema.isLightRail).toBe(true)
    expect(schema.showServiceTab).toBe(true)
    expect(schema.showLinesServed).toBe(true)
    expect(schema.requireCrsCode).toBe(false)
  })

  it('includes Admin tab for every network catalog schema', () => {
    for (const id of NETWORK_COLLECTION_IDS) {
      const schema = inferStationCollectionFieldSchema([], id)
      expect(schema.showAdminTab).toBe(true)
      expect(getVisibleStationDetailsTabs(schema)).toContain('admin')
    }
  })

  it('folds additional into details and keeps step-free off Details for GB National Rail', () => {
    const schema = inferStationCollectionFieldSchema([], 'stations_gbnr')
    expect(schema.foldAdditionalIntoDetails).toBe(true)
    expect(schema.stepFreeInDetails).toBe(false)
    expect(stationDetailsShowsAdditionalTab(schema)).toBe(false)
  })

  it('matches lean regional catalog for NI Translink and Irish Rail', () => {
    for (const id of ['stations_nitranslink', 'stations_roiirerail'] as const) {
      const schema = inferStationCollectionFieldSchema([], id)
      expect(schema.foldAdditionalIntoDetails).toBe(true)
      expect(schema.showTiploc).toBe(false)
      expect(schema.requireTiploc).toBe(false)
      expect(schema.showAdminUrlSlug).toBe(true)
      expect(schema.postEirCodeInLocation).toBe(true)
      expect(stationDetailsShowsAdditionalTab(schema)).toBe(false)
      expect(getVisibleStationDetailsTabs(schema)).not.toContain('additional')
      expect(getVisibleStationDetailsTabs(schema)).toContain('admin')
    }
  })

  it('does not promote urlSlug into Details for lean regional sampled docs', () => {
    const schema = inferStationCollectionFieldSchema(
      [{ urlSlug: 'belfast-central', province: 'Ulster', 'post-eir_code': 'BT1 1AA' }],
      'stations_nitranslink'
    )
    expect(schema.showUrl).toBe(false)
    expect(schema.showAdminUrlSlug).toBe(true)
    expect(schema.showProvince).toBe(true)
    expect(schema.showPostEirCode).toBe(true)
    expect(schema.postEirCodeInLocation).toBe(true)
    expect(stationDetailsShowsAdditionalTab(schema)).toBe(false)
  })

  it('hides Knowledgebase-covered Firebase fields for GBNR even when docs have data', () => {
    const schema = inferStationCollectionFieldSchema(
      [
        {
          nlc: '848700',
          staffingLevel: 'fullTime',
          toilets: { toiletsAccessible: true, toiletsBabyChanging: true },
          stepFree: { stepFreeCode: 'A', stepFreeNote: 'Category A' },
          lift: { liftAvailable: true },
          connections: {
            connectionBus: true,
            connectionTaxi: true,
            connectionUnderground: false,
          },
          'min-connection-time': 5,
          is: { isrequeststop: true, Islimitedservice: true },
          stationstatus: { status: 'open' },
          facilities: {
            WiFi: true,
            CCTV: true,
            customOnlyInFirebase: true,
          },
        },
      ],
      'stations_gbnr'
    )
    expect(schema.showNlc).toBe(false)
    expect(schema.showStaffingLevel).toBe(false)
    expect(schema.showToiletsSection).toBe(false)
    expect(schema.showStepFreeSection).toBe(false)
    expect(schema.showStepFreeNote).toBe(false)
    expect(schema.showConnectionBus).toBe(false)
    expect(schema.showConnectionTaxi).toBe(false)
    expect(schema.showConnectionUnderground).toBe(false)
    expect(schema.facilityKeys).toEqual([])
    expect(schema.showFacilitiesTab).toBe(false)
    // Lift / service / step-free also suppressed for GBNR (KB covers them)
    expect(schema.showLiftSection).toBe(false)
    expect(schema.showStepFreeTab).toBe(false)
    expect(schema.showMinConnectionTime).toBe(false)
    expect(schema.showRequestStop).toBe(false)
    expect(schema.showLimitedService).toBe(false)
    expect(schema.showStationStatusSection).toBe(false)
    expect(schema.showServiceTab).toBe(false)
    expect(schema.showOperatorCode).toBe(false)
    expect(schema.showKnowledgebaseTab).toBe(true)
  })

  it('still shows staffing/NLC/step-free for heritage when docs have data', () => {
    const schema = inferStationCollectionFieldSchema(
      [{ nlc: '1234', staffingLevel: 'partTime', stepFree: { stepFreeCode: 'B' } }],
      'stations_gbheritage'
    )
    expect(schema.showNlc).toBe(true)
    expect(schema.showStaffingLevel).toBe(true)
    expect(schema.showStepFreeSection).toBe(true)
  })
})
