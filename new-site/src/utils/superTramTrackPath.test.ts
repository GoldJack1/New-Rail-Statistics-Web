import { describe, expect, it } from 'vitest'
import {
  isExcessiveTrackDetour,
  nearestTrackNodeKey,
  pointAlongTrackPath,
  shortestTrackPathBetweenLatLngs,
  shortestTrackPathBetweenNodes,
  trackFollowDurationSeconds,
  trackPathLengthMeters,
  TRACK_FOLLOW_SPEED_MPS,
  type SuperTramTrackGraph,
} from './superTramTrackPath'

const tinyGraph: SuperTramTrackGraph = {
  nodes: {
    a: [53.4, -1.5],
    b: [53.401, -1.5],
    c: [53.402, -1.5],
    d: [53.4, -1.49],
    // Parallel rail near `b` that only meets the main line at `a` (far from `c`)
    p: [53.401, -1.50015],
  },
  edges: [
    ['a', 'b', 111],
    ['b', 'c', 111],
    ['a', 'd', 670],
    ['a', 'p', 112],
  ],
}

describe('superTramTrackPath', () => {
  it('finds the nearest node', () => {
    expect(nearestTrackNodeKey(tinyGraph, 53.4002, -1.5)).toBe('a')
    expect(nearestTrackNodeKey(tinyGraph, 53.4018, -1.5)).toBe('c')
  })

  it('routes along the shorter track branch', () => {
    const path = shortestTrackPathBetweenNodes(tinyGraph, 'a', 'c')
    expect(path?.map((p) => `${p[0]}`)).toEqual(['53.4', '53.401', '53.402'])
  })

  it('avoids parallel-rail detours between nearby stops', () => {
    // From near `p` (parallel) to near `c` — naive nearest snap is p→…→a→…→c.
    const path = shortestTrackPathBetweenLatLngs(
      tinyGraph,
      [53.401, -1.50014],
      [53.402, -1.5]
    )
    const length = trackPathLengthMeters(path)
    const direct = trackPathLengthMeters([
      [53.401, -1.50014],
      [53.402, -1.5],
    ])
    expect(isExcessiveTrackDetour(length, direct)).toBe(false)
    expect(length).toBeLessThan(250)
  })

  it('uses a constant speed for duration', () => {
    expect(trackFollowDurationSeconds(360)).toBeCloseTo(360 / TRACK_FOLLOW_SPEED_MPS, 5)
    expect(trackFollowDurationSeconds(90)).toBeCloseTo(90 / TRACK_FOLLOW_SPEED_MPS, 5)
  })

  it('samples a point part-way along a path', () => {
    const path: Array<[number, number]> = [
      [53.4, -1.5],
      [53.401, -1.5],
      [53.402, -1.5],
    ]
    const length = trackPathLengthMeters(path)
    const mid = pointAlongTrackPath(path, length / 2)
    expect(mid[0]).toBeGreaterThan(53.4)
    expect(mid[0]).toBeLessThan(53.402)
    expect(mid[1]).toBeCloseTo(-1.5, 5)
  })
})
