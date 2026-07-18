import { describe, expect, it } from 'vitest'
import {
  getContrastingTextColor,
  getTocOperatorChipColors,
  mapTocOperatorDoc,
  resolveTocOperatorDisplayName,
} from '@/utils/tocOperatorMap'

describe('mapTocOperatorDoc', () => {
  it('maps Firebase toc_operators fields', () => {
    expect(
      mapTocOperatorDoc('avanti', {
        name: 'Avanti West Coast',
        colorHex: '#004354',
        operatorregion: 'England, Scotland, Wales',
        operatortype: 'Rail Operator',
      })
    ).toEqual({
      id: 'avanti',
      name: 'Avanti West Coast',
      colorHex: '#004354',
      operatorRegion: 'England, Scotland, Wales',
      operatorType: 'Rail Operator',
    })
  })
})

describe('getTocOperatorChipColors', () => {
  const operators = [
    {
      id: 'avanti',
      name: 'Avanti West Coast',
      colorHex: '#004354',
      operatorRegion: null,
      operatorType: null,
    },
  ]

  it('uses operator colour and light text on dark backgrounds', () => {
    expect(getTocOperatorChipColors(operators, 'Avanti West Coast')).toEqual({
      bg: '#004354',
      text: '#ffffff',
    })
  })

  it('falls back when TOC is unknown', () => {
    expect(getTocOperatorChipColors(operators, 'Unknown TOC').bg).toBe('#64748b')
  })
})

describe('resolveTocOperatorDisplayName', () => {
  const operators = [
    {
      id: 'avanti',
      name: 'Avanti West Coast',
      colorHex: '#004354',
      operatorRegion: null,
      operatorType: null,
    },
  ]

  it('returns canonical Firebase name on case-insensitive match', () => {
    expect(resolveTocOperatorDisplayName(operators, 'avanti west coast')).toBe(
      'Avanti West Coast'
    )
  })
})

describe('getContrastingTextColor', () => {
  it('picks dark text on light backgrounds', () => {
    expect(getContrastingTextColor('#ecb739')).toBe('#1a1a1a')
  })
})
