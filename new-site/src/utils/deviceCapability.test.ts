import { describe, expect, it } from 'vitest'
import {
  resolveDevicePerformanceTier,
  shouldGateAllNetworksMap,
} from '@/utils/deviceCapability'

describe('resolveDevicePerformanceTier', () => {
  it('keeps iOS on full tier even when deviceMemory is missing', () => {
    expect(
      resolveDevicePerformanceTier({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      })
    ).toBe('full')
  })

  it('uses lite tier for Android phones in the 4GB memory bucket', () => {
    expect(
      resolveDevicePerformanceTier({
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 4a)',
        deviceMemory: 4,
        hardwareConcurrency: 8,
      })
    ).toBe('lite')
  })

  it('uses lite tier for Android phones when deviceMemory is missing', () => {
    expect(
      resolveDevicePerformanceTier({
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 4a) AppleWebKit/537.36 Mobile',
      })
    ).toBe('lite')
  })

  it('keeps higher-memory Android on full tier', () => {
    expect(
      resolveDevicePerformanceTier({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
        deviceMemory: 8,
        hardwareConcurrency: 8,
      })
    ).toBe('full')
  })

  it('honours a session override back to full', () => {
    expect(
      resolveDevicePerformanceTier({
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 4a)',
        deviceMemory: 4,
        liteMapOverride: true,
      })
    ).toBe('full')
  })
})

describe('shouldGateAllNetworksMap', () => {
  it('gates only all-network lite map without override', () => {
    expect(shouldGateAllNetworksMap('lite', 'all', false)).toBe(true)
    expect(shouldGateAllNetworksMap('lite', 'stations_gbnr', false)).toBe(false)
    expect(shouldGateAllNetworksMap('lite', 'all', true)).toBe(false)
    expect(shouldGateAllNetworksMap('full', 'all', false)).toBe(false)
  })
})
