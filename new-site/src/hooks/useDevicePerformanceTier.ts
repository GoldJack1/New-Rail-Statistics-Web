'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  readDeviceCapabilityFromBrowser,
  readLiteMapOverrideFromSession,
  resolveDevicePerformanceTier,
  shouldGateAllNetworksMap,
  writeLiteMapOverrideToSession,
  type DevicePerformanceTier,
} from '@/utils/deviceCapability'

export function useDevicePerformanceTier(networkView: string) {
  const [tier, setTier] = useState<DevicePerformanceTier>('full')
  const [liteMapOverride, setLiteMapOverride] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const input = readDeviceCapabilityFromBrowser()
    const override = readLiteMapOverrideFromSession()
    setLiteMapOverride(override)
    setTier(resolveDevicePerformanceTier({ ...input, liteMapOverride: override }))
    setReady(true)
  }, [])

  const enableFullMapOverride = useCallback(() => {
    writeLiteMapOverrideToSession(true)
    setLiteMapOverride(true)
    setTier('full')
  }, [])

  const shouldGateAllNetworks = ready && shouldGateAllNetworksMap(tier, networkView, liteMapOverride)
  const isLiteMode = tier === 'lite' && !liteMapOverride

  return {
    ready,
    tier,
    isLiteMode,
    liteMapOverride,
    shouldGateAllNetworks,
    enableFullMapOverride,
  }
}
