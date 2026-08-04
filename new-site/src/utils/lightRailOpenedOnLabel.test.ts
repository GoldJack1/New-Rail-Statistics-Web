import { describe, expect, it } from 'vitest'
import { formatLightRailOpenedOnLabel } from './lightRailOpenedOnLabel'

describe('formatLightRailOpenedOnLabel', () => {
  it('formats date without order by default', () => {
    expect(
      formatLightRailOpenedOnLabel({
        dateOpened: '21/03/1994',
        orderOfOpening: 1,
      })
    ).toBe('Opened on 21 March 1994')
  })

  it('includes order of opening when requested', () => {
    expect(
      formatLightRailOpenedOnLabel(
        {
          dateOpened: '21/03/1994',
          orderOfOpening: 1,
        },
        { includeOrderOfOpening: true }
      )
    ).toBe('Opened on 21 March 1994 (1)')
  })

  it('omits parentheses when order is missing even if requested', () => {
    expect(
      formatLightRailOpenedOnLabel(
        {
          dateOpened: '22/08/1994',
          orderOfOpening: null,
        },
        { includeOrderOfOpening: true }
      )
    ).toBe('Opened on 22 August 1994')
  })

  it('returns null without a parseable date', () => {
    expect(formatLightRailOpenedOnLabel({ dateOpened: null, orderOfOpening: 3 })).toBeNull()
    expect(formatLightRailOpenedOnLabel({ dateOpened: '', orderOfOpening: 3 })).toBeNull()
  })
})
