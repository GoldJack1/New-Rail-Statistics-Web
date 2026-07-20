import { describe, expect, it } from 'vitest'
import {
  resolveStationDetailsSourceHint,
  splitStationDetailsSourceHintLines,
  STATION_DETAILS_LOCATION_SOURCE_HINT,
  STATION_DETAILS_USAGE_SOURCE_HINT,
} from './stationDetailsSourceHint'

describe('resolveStationDetailsSourceHint', () => {
  const kbLabels = {
    showKnowledgebaseTab: true,
    knowledgebaseLastUpdatedLabel:
      'The data shown on this page was last updated by National Rail Enquiries on 31st March 2026 at 08:08.',
    knowledgebaseDetailsSourceHint:
      'Some data shown on this page was last updated by National Rail Enquiries on 31st March 2026 at 08:08. With a large majority of data being added by Rail Statistics.',
  }

  it('returns location and usage fixed attribution lines', () => {
    expect(resolveStationDetailsSourceHint('location', kbLabels)).toBe(
      STATION_DETAILS_LOCATION_SOURCE_HINT
    )
    expect(resolveStationDetailsSourceHint('usage', kbLabels)).toBe(STATION_DETAILS_USAGE_SOURCE_HINT)
  })

  it('returns details mix line when Knowledgebase is enabled', () => {
    expect(resolveStationDetailsSourceHint('details', kbLabels)).toBe(
      kbLabels.knowledgebaseDetailsSourceHint
    )
    expect(
      resolveStationDetailsSourceHint('details', { ...kbLabels, showKnowledgebaseTab: false })
    ).toBeNull()
  })

  it('returns NRE last-updated line for other KB-backed tabs', () => {
    expect(resolveStationDetailsSourceHint('admin', kbLabels)).toBe(
      kbLabels.knowledgebaseLastUpdatedLabel
    )
    expect(resolveStationDetailsSourceHint('kb:Accessibility', kbLabels)).toBe(
      kbLabels.knowledgebaseLastUpdatedLabel
    )
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
