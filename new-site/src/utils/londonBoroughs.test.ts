import { describe, expect, it } from 'vitest'
import {
  expandLondonBoroughField,
  getLondonBoroughOptions,
  isLondonBoroughOption,
  LONDON_BOROUGH_NAMES,
} from './londonBoroughs'

describe('londonBoroughs', () => {
  it('defines 33 London boroughs', () => {
    expect(LONDON_BOROUGH_NAMES).toHaveLength(33)
  })

  it('excludes combined locality labels from London borough options', () => {
    const allBoroughs = [
      'Greenwich',
      'Greenwich & Bexley',
      'Hackney & Tower Hamlets',
      'Kingston-upon-Thames',
      'York',
    ]

    expect(getLondonBoroughOptions(allBoroughs)).toEqual(['Greenwich', 'Kingston-upon-Thames'])
  })

  it('recognises hyphenated Kingston and Richmond labels', () => {
    expect(isLondonBoroughOption('Kingston-upon-Thames')).toBe(true)
    expect(isLondonBoroughOption('Richmond-upon-Thames')).toBe(true)
  })

  it('expands combined borough labels for station matching', () => {
    expect(expandLondonBoroughField('Greenwich & Bexley')).toEqual(['Greenwich', 'Bexley'])
  })
})
