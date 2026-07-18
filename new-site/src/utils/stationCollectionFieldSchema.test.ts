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
    expect(schema.showUrl).toBe(false)
    expect(schema.showServiceTab).toBe(false)
    expect(schema.isLightRail).toBe(false)
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
})
