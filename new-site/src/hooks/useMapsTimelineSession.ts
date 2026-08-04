'use client'

import { useEffect, useState } from 'react'
import {
  readMapsTimelineSessionState,
  writeMapsTimelineSessionState,
} from '@/utils/mapsTimelineStorage'

/**
 * Timeline mode/step for the stations map. Survives map remounts (e.g. open a
 * stop and return) via sessionStorage for the browser tab.
 * Follow / order-number toggles default off.
 */
export function useMapsTimelineSession(showSuperTramTimeline: boolean, stepsLength: number) {
  const [timelineModeEnabled, setTimelineModeEnabled] = useState(false)
  const [timelineStepIndex, setTimelineStepIndex] = useState(0)
  const [timelinePlaying, setTimelinePlaying] = useState(false)
  const [timelineFollowAppearing, setTimelineFollowAppearing] = useState(false)
  const [timelineShowOrderOfOpening, setTimelineShowOrderOfOpening] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const saved = readMapsTimelineSessionState()
    if (saved) {
      setTimelineModeEnabled(saved.modeEnabled)
      setTimelineStepIndex(saved.stepIndex)
      setTimelineFollowAppearing(saved.followAppearing)
      setTimelineShowOrderOfOpening(saved.showOrderOfOpening)
    }
    setSessionReady(true)
  }, [])

  useEffect(() => {
    if (!sessionReady) return
    writeMapsTimelineSessionState({
      modeEnabled: timelineModeEnabled,
      stepIndex: timelineStepIndex,
      followAppearing: timelineFollowAppearing,
      showOrderOfOpening: timelineShowOrderOfOpening,
    })
  }, [
    sessionReady,
    timelineModeEnabled,
    timelineStepIndex,
    timelineFollowAppearing,
    timelineShowOrderOfOpening,
  ])

  useEffect(() => {
    if (!sessionReady) return
    setTimelinePlaying(false)
    if (!showSuperTramTimeline) {
      setTimelineModeEnabled(false)
      return
    }
    if (stepsLength === 0) return
    const max = stepsLength - 1
    setTimelineStepIndex((prev) =>
      timelineModeEnabled ? Math.min(Math.max(0, prev), max) : max
    )
  }, [sessionReady, showSuperTramTimeline, stepsLength, timelineModeEnabled])

  return {
    timelineModeEnabled,
    setTimelineModeEnabled,
    timelineStepIndex,
    setTimelineStepIndex,
    timelinePlaying,
    setTimelinePlaying,
    timelineFollowAppearing,
    setTimelineFollowAppearing,
    timelineShowOrderOfOpening,
    setTimelineShowOrderOfOpening,
  }
}
