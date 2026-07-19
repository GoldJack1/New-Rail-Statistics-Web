import { describe, expect, it } from 'vitest'
import {
  gbnrPassUsageDocId,
  gbnrPassUsageDocIdCandidates,
  orrNlcLookupCandidates,
} from '@/constants/gbnrPassUsageData'

describe('gbnrPassUsageDocId', () => {
  it('joins CRS and NLC', () => {
    expect(gbnrPassUsageDocId('abw', '5131')).toBe('ABW_5131')
    expect(gbnrPassUsageDocId(' ABD ', ' 8976 ')).toBe('ABD_8976')
  })
})

describe('orrNlcLookupCandidates', () => {
  it('adds 4-digit form for Knowledgebase 6-digit NLCs', () => {
    expect(orrNlcLookupCandidates('513100')).toEqual(['513100', '5131'])
    expect(orrNlcLookupCandidates('5131')).toEqual(['5131'])
  })
})

describe('gbnrPassUsageDocIdCandidates', () => {
  it('tries 6-digit then 4-digit doc ids', () => {
    expect(gbnrPassUsageDocIdCandidates('ABW', '513100')).toEqual(['ABW_513100', 'ABW_5131'])
  })
})
