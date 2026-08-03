const MAPS_TIMELINE_SESSION_KEY = 'railstats:mapsTimeline'

export type MapsTimelineSessionState = {
  modeEnabled: boolean
  stepIndex: number
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
      })
    )
  } catch {
    /* quota / private mode */
  }
}
