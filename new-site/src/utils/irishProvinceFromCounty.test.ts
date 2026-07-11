import { describe, expect, it } from 'vitest'
import { inferProvinceFromCounty } from './irishProvinceFromCounty'

describe('inferProvinceFromCounty', () => {
  it('maps NI counties to Ulster', () => {
    expect(inferProvinceFromCounty('Antrim')).toBe('Ulster')
    expect(inferProvinceFromCounty('County Down')).toBe('Ulster')
  })

  it('maps ROI counties to their province', () => {
    expect(inferProvinceFromCounty('Cork')).toBe('Munster')
    expect(inferProvinceFromCounty('Co. Dublin')).toBe('Leinster')
    expect(inferProvinceFromCounty('Galway')).toBe('Connacht')
  })

  it('returns null for unknown counties', () => {
    expect(inferProvinceFromCounty('')).toBeNull()
    expect(inferProvinceFromCounty('Unknown')).toBeNull()
  })
})
