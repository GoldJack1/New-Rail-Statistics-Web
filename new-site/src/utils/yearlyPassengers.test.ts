import { describe, expect, it } from 'vitest'
import {
  extractYearlyPassengersFromFirestoreData,
  formatPassengerAxisTick,
  getLatestYearlyPassengerCount,
  getLatestYearlyPassengerDisplay,
  getYearlyPassengerChartPoints,
  parseYearlyPassengerCount,
} from './yearlyPassengers'

describe('yearlyPassengers', () => {
  it('parses numeric strings with commas', () => {
    expect(parseYearlyPassengerCount('10,655,006')).toBe(10655006)
    expect(parseYearlyPassengerCount(' 1234 ')).toBe(1234)
  })

  it('reads latest passengers from nested yearlyPassengers with string values', () => {
    const count = getLatestYearlyPassengerCount({
      '2022': 1000,
      '2024': null,
      '2023': 2500,
    })

    expect(count).toBe(2500)
    expect(getLatestYearlyPassengerDisplay({ '2023': 2500 })).toBe('(2023) 2,500')
  })

  it('extracts yearly passengers from top-level Firestore year keys', () => {
    const extracted = extractYearlyPassengersFromFirestoreData({
      stationname: 'Abbey Wood',
      '2024': '10655006',
      '2023': 7118664,
    })

    expect(extracted).toEqual({
      '2024': 10655006,
      '2023': 7118664,
    })
    expect(getLatestYearlyPassengerCount(extracted)).toBe(10655006)
  })

  it('prefers nested yearlyPassengers when present', () => {
    const extracted = extractYearlyPassengersFromFirestoreData({
      yearlyPassengers: { '2024': 100 },
      '2023': 999,
    })

    expect(extracted).toEqual({ '2024': 100 })
  })

  it('builds ascending chart points and skips null years', () => {
    expect(
      getYearlyPassengerChartPoints({
        '2022': 1000,
        '2024': null,
        '2023': 2500,
        '2019': 900,
      })
    ).toEqual([
      { year: '2019', value: 900 },
      { year: '2022', value: 1000 },
      { year: '2023', value: 2500 },
    ])
  })

  it('formats compact passenger axis ticks', () => {
    expect(formatPassengerAxisTick(0)).toBe('0')
    expect(formatPassengerAxisTick(500)).toBe('500')
    expect(formatPassengerAxisTick(3000)).toBe('3K')
    expect(formatPassengerAxisTick(10655006)).toBe('11M')
  })
})
