import { describe, expect, it } from 'vitest'
import {
  getStationDetailsNetworkSourceHint,
  resolveStationDetailsSourceHint,
  splitStationDetailsSourceHintLines,
  STATION_DETAILS_LOCATION_SOURCE_HINT,
  STATION_DETAILS_REVIEWED_SOURCE_HINT,
  STATION_DETAILS_SUPERTRAM_SOURCE_HINT,
  STATION_DETAILS_USAGE_SOURCE_HINT,
} from './stationDetailsSourceHint'

describe('getStationDetailsNetworkSourceHint', () => {
  it('returns reviewing line for GBNR and GB Heritage', () => {
    expect(getStationDetailsNetworkSourceHint('stations_gbnr')).toBe(
      STATION_DETAILS_REVIEWED_SOURCE_HINT
    )
    expect(getStationDetailsNetworkSourceHint('stations_gbheritage')).toBe(
      STATION_DETAILS_REVIEWED_SOURCE_HINT
    )
  })

  it('returns sourced-by line for SuperTram', () => {
    expect(getStationDetailsNetworkSourceHint('lightrail_GBSHEFFSUPERTRAM')).toBe(
      STATION_DETAILS_SUPERTRAM_SOURCE_HINT
    )
  })

  it('appends limited-data note for Irish Rail and NI Translink', () => {
    expect(getStationDetailsNetworkSourceHint('stations_roiirerail')).toContain(
      'Please note data for Irish Rail is limited'
    )
    expect(getStationDetailsNetworkSourceHint('stations_nitranslink')).toContain(
      'Please note data for NI Translink is limited'
    )
    expect(getStationDetailsNetworkSourceHint('stations_nitranslink')).toContain(
      'enquires@railstatistics.co.uk'
    )
  })
})

describe('resolveStationDetailsSourceHint', () => {
  const kbLabels = {
    showKnowledgebaseTab: true,
    knowledgebaseLastUpdatedLabel:
      'The data shown on this page was last updated by National Rail Enquiries on 31st March 2026 at 08:08.',
    knowledgebaseDetailsSourceHint:
      'Some data shown on this page was last updated by National Rail Enquiries on 31st March 2026 at 08:08. With a large majority of data being added by Rail Statistics.',
    networkCollectionId: 'stations_gbnr' as const,
  }

  it('returns location and usage fixed attribution lines', () => {
    expect(resolveStationDetailsSourceHint('location', kbLabels)).toBe(
      STATION_DETAILS_LOCATION_SOURCE_HINT
    )
    expect(resolveStationDetailsSourceHint('usage', kbLabels)).toBe(STATION_DETAILS_USAGE_SOURCE_HINT)
  })

  it('returns SuperTram location attribution', () => {
    expect(
      resolveStationDetailsSourceHint('location', {
        showKnowledgebaseTab: false,
        networkCollectionId: 'lightrail_GBSHEFFSUPERTRAM',
      })
    ).toBe(STATION_DETAILS_SUPERTRAM_SOURCE_HINT)
  })

  it('returns details mix line when Knowledgebase is enabled', () => {
    expect(resolveStationDetailsSourceHint('details', kbLabels)).toBe(
      kbLabels.knowledgebaseDetailsSourceHint
    )
    expect(
      resolveStationDetailsSourceHint('details', {
        ...kbLabels,
        showKnowledgebaseTab: false,
        networkCollectionId: 'stations_gbheritage',
      })
    ).toBe(STATION_DETAILS_REVIEWED_SOURCE_HINT)
  })

  it('returns NRE last-updated line for other KB-backed tabs', () => {
    expect(resolveStationDetailsSourceHint('admin', kbLabels)).toBe(
      kbLabels.knowledgebaseLastUpdatedLabel
    )
    expect(resolveStationDetailsSourceHint('kb:Accessibility', kbLabels)).toBe(
      kbLabels.knowledgebaseLastUpdatedLabel
    )
  })

  it('returns network attribution for non-KB tabs', () => {
    expect(
      resolveStationDetailsSourceHint('facilities', {
        showKnowledgebaseTab: false,
        networkCollectionId: 'stations_roiirerail',
      })
    ).toContain('Please note data for Irish Rail is limited')
  })
})

describe('splitStationDetailsSourceHintLines', () => {
  it('breaks after sentence-ending periods', () => {
    expect(
      splitStationDetailsSourceHintLines(
        'Some data shown on this page was last updated by National Rail Enquiries on 31st March 2026 at 08:08. With a large majority of data being added by Rail Statistics.'
      )
    ).toEqual([
      'Some data shown on this page was last updated by National Rail Enquiries on 31st March 2026 at 08:08.',
      'With a large majority of data being added by Rail Statistics.',
    ])
  })

  it('keeps a single sentence as one line', () => {
    expect(splitStationDetailsSourceHintLines(STATION_DETAILS_LOCATION_SOURCE_HINT)).toEqual([
      STATION_DETAILS_LOCATION_SOURCE_HINT,
    ])
  })
})
