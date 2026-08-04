const MAPS_TIMELINE_SESSION_KEY = 'railstats:mapsTimeline:v2'

export type MapsTimelineSessionState = {
  modeEnabled: boolean
  stepIndex: number
  /** Slowly fly the map to newly appearing stops while the timeline plays. Default off. */
  followAppearing: boolean
  /** Show “· #N” order-of-opening on the timeline date. Default off. */
  showOrderOfOpening: boolean
}

export function readMapsTimelineSessionState(): MapsTimelineSessionState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(MAPS_TIMELINE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MapsTimelineSessionState>
    if (typeof parsed !== 'object' || parsed === null) return null
    const stepIndex =
      typeof parsed.stepIndex === 'number' && Number.isFinite(parsed.stepIndex)
        ? Math.max(0, Math.floor(parsed.stepIndex))
        : 0
    return {
      modeEnabled: Boolean(parsed.modeEnabled),
      stepIndex,
      // Explicit true only — missing/undefined stays off by default.
      followAppearing: parsed.followAppearing === true,
      showOrderOfOpening: parsed.showOrderOfOpening === true,
    }
  } catch {
    return null
  }
}

export function writeMapsTimelineSessionState(state: MapsTimelineSessionState): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      MAPS_TIMELINE_SESSION_KEY,
      JSON.stringify({
        modeEnabled: Boolean(state.modeEnabled),
        stepIndex: Math.max(0, Math.floor(state.stepIndex)),
        followAppearing: state.followAppearing === true,
        showOrderOfOpening: state.showOrderOfOpening === true,
      })
    )
  } catch {
    /* quota / private mode */
  }
}
