import { afterEach, describe, expect, it } from 'vitest'
import {
  finishStationsListFiltersRestore,
  getDefaultStationsListFiltersState,
  markStationsListFiltersForRestore,
  normalizeSupertramLineFilter,
  peekStationsListFiltersStateForRestore,
  readStationsListFiltersState,
  toggleSupertramLineFilter,
  writeStationsListFiltersState,
} from './stationsListFiltersStorage'

describe('stationsListFiltersStorage', () => {
  afterEach(() => {
    writeStationsListFiltersState(null)
    finishStationsListFiltersRestore()
    sessionStorage.removeItem('railstats:stationsListFilters:restore:v1')
  })

  it('reads null when nothing is stored', () => {
    expect(readStationsListFiltersState()).toBeNull()
  })

  it('persists filter state including network and sort', () => {
    const state = {
      ...getDefaultStationsListFiltersState('lightrail_GBSHEFFSUPERTRAM'),
      searchTerm: 'Cathedral',
      hasUserInteractedWithFilters: true,
      sortOption: 'name-desc' as const,
      passengerSortYear: '2023' as const,
      tableSort: { column: 'name' as const, direction: 'desc' as const },
      filterSelections: {
        ...getDefaultStationsListFiltersState().filterSelections,
        dateOpened: ['21/03/1994'],
      },
      supertramLineFilter: ['Blue'],
      currentPage: 2,
    }

    writeStationsListFiltersState(state)
    expect(readStationsListFiltersState()).toEqual(state)
  })

  it('defaults missing passengerSortYear to latest for older snapshots', () => {
    const base = getDefaultStationsListFiltersState('stations_gbnr')
    const { passengerSortYear: _ignored, ...legacy } = base
    sessionStorage.setItem('railstats:stationsListFilters:v1', JSON.stringify(legacy))
    expect(readStationsListFiltersState()?.passengerSortYear).toBe('latest')
  })

  it('normalizes a full line selection to All and accepts legacy string values', () => {
    const state = {
      ...getDefaultStationsListFiltersState('lightrail_GBSHEFFSUPERTRAM'),
      supertramLineFilter: ['Blue', 'Yellow', 'Purple', 'Tram-Train'] as const,
    }
    writeStationsListFiltersState(state as ReturnType<typeof getDefaultStationsListFiltersState>)
    expect(readStationsListFiltersState()?.supertramLineFilter).toEqual([])

    sessionStorage.setItem(
      'railstats:stationsListFilters:v1',
      JSON.stringify({
        ...getDefaultStationsListFiltersState('lightrail_GBSHEFFSUPERTRAM'),
        supertramLineFilter: 'Yellow',
      })
    )
    expect(readStationsListFiltersState()?.supertramLineFilter).toEqual(['Yellow'])
  })

  it('toggles lines and collapses a full selection to All', () => {
    expect(toggleSupertramLineFilter([], 'Blue')).toEqual(['Blue'])
    expect(toggleSupertramLineFilter(['Blue'], 'Yellow')).toEqual(['Blue', 'Yellow'])
    expect(toggleSupertramLineFilter(['Blue', 'Yellow', 'Purple'], 'Tram-Train')).toEqual([])
    expect(toggleSupertramLineFilter(['Blue'], 'Blue')).toEqual([])
    expect(normalizeSupertramLineFilter(['Yellow', 'Blue', 'Yellow'])).toEqual(['Blue', 'Yellow'])
  })

  it('only restores when marked for restore', () => {
    const state = getDefaultStationsListFiltersState('lightrail_GBSHEFFSUPERTRAM')
    writeStationsListFiltersState(state)

    expect(peekStationsListFiltersStateForRestore()).toBeNull()
    expect(readStationsListFiltersState()).toBeNull()
    finishStationsListFiltersRestore()

    writeStationsListFiltersState(state)
    markStationsListFiltersForRestore()
    expect(peekStationsListFiltersStateForRestore()).toEqual(state)
    // Strict Mode safe: second peek returns the same snapshot
    expect(peekStationsListFiltersStateForRestore()).toEqual(state)

    finishStationsListFiltersRestore()
    expect(peekStationsListFiltersStateForRestore()).toBeNull()
  })

  it('rejects invalid payloads', () => {
    sessionStorage.setItem('railstats:stationsListFilters:v1', '{"searchTerm":1}')
    expect(readStationsListFiltersState()).toBeNull()
  })
})
