export type DevicePerformanceTier = 'full' | 'lite'

export const LITE_MAP_OVERRIDE_SESSION_KEY = 'railstats_map_lite_override'

export interface DeviceCapabilityInput {
  userAgent: string
  deviceMemory?: number
  hardwareConcurrency?: number
  saveData?: boolean
  prefersReducedMotion?: boolean
  liteMapOverride?: boolean
}

/** Max station markers drawn at once in lite map mode (viewport-culled). */
export const LITE_MAP_MAX_MARKERS = 350

export function resolveDevicePerformanceTier(input: DeviceCapabilityInput): DevicePerformanceTier {
  if (input.liteMapOverride) return 'full'
  if (input.saveData || input.prefersReducedMotion) return 'lite'

  const isIOS = /iPhone|iPad|iPod/i.test(input.userAgent)
  if (isIOS) return 'full'

  const isAndroid = /Android/i.test(input.userAgent)
  if (!isAndroid) return 'full'

  const isAndroidPhone = /Mobile/i.test(input.userAgent) && !/Tablet/i.test(input.userAgent)
  const memory = input.deviceMemory
  const cores = input.hardwareConcurrency ?? 8

  if (memory === 2 || cores <= 4) return 'lite'
  if (memory !== undefined && memory <= 4) return 'lite'
  // deviceMemory is often missing on older/low-end Android Chrome builds.
  if (isAndroidPhone && memory === undefined) return 'lite'

  return 'full'
}

export function shouldGateAllNetworksMap(
  tier: DevicePerformanceTier,
  networkView: string,
  liteMapOverride: boolean
): boolean {
  return tier === 'lite' && !liteMapOverride && networkView === 'all'
}

export function readLiteMapOverrideFromSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(LITE_MAP_OVERRIDE_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeLiteMapOverrideToSession(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (enabled) {
      window.sessionStorage.setItem(LITE_MAP_OVERRIDE_SESSION_KEY, 'true')
    } else {
      window.sessionStorage.removeItem(LITE_MAP_OVERRIDE_SESSION_KEY)
    }
  } catch {
    // Best-effort.
  }
}

export function readDeviceCapabilityFromBrowser(): DeviceCapabilityInput {
  if (typeof window === 'undefined') {
    return { userAgent: '' }
  }

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection

  return {
    userAgent: navigator.userAgent,
    // @ts-expect-error deviceMemory is not in all TS lib defs
    deviceMemory: typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : undefined,
    hardwareConcurrency: navigator.hardwareConcurrency,
    saveData: connection?.saveData,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    liteMapOverride: readLiteMapOverrideFromSession(),
  }
}
