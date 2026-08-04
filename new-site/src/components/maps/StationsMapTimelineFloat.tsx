'use client'

import { useEffect, useRef, useState } from 'react'
import StationsMapTimeline from './StationsMapTimeline'
import type { Station } from '@/types'

const TIMELINE_FLOAT_MOTION_MS = 280

interface StationsMapTimelineFloatProps {
  /**
   * When true, the overlay should be shown (SuperTram selected and side panel closed).
   * Toggling this plays the slide enter/exit — including network tab changes.
   */
  active: boolean
  stations: Station[]
  stepIndex: number
  onStepIndexChange: (index: number) => void
  isPlaying: boolean
  onPlayingChange: (playing: boolean) => void
  modeEnabled: boolean
  onModeEnabledChange: (enabled: boolean) => void
  followAppearing: boolean
  onFollowAppearingChange: (enabled: boolean) => void
  showOrderOfOpening?: boolean
  modeDisabled?: boolean
  modeDisabledMessage?: string
  modeDisabledAriaLabel?: string
}

type TimelinePanelSnapshot = {
  stations: Station[]
  stepIndex: number
  isPlaying: boolean
  modeEnabled: boolean
  followAppearing: boolean
  showOrderOfOpening: boolean
  modeDisabled: boolean
}

/**
 * Floating SuperTram timeline with slide-down enter and slide-up exit.
 * Stays mounted through the exit so the reverse animation can play when the
 * side panel opens or when leaving the SuperTram network tab.
 */
export default function StationsMapTimelineFloat({
  active,
  stations,
  stepIndex,
  onStepIndexChange,
  isPlaying,
  onPlayingChange,
  modeEnabled,
  onModeEnabledChange,
  followAppearing,
  onFollowAppearingChange,
  showOrderOfOpening = false,
  modeDisabled = false,
  modeDisabledMessage,
  modeDisabledAriaLabel,
}: StationsMapTimelineFloatProps) {
  const openRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [panel, setPanel] = useState<TimelinePanelSnapshot | null>(null)

  // Keep panel content in sync while active; freeze the last frame for exit.
  useEffect(() => {
    if (!active) return
    setPanel({
      stations,
      stepIndex,
      isPlaying,
      modeEnabled,
      followAppearing,
      showOrderOfOpening,
      modeDisabled,
    })
  }, [
    active,
    stations,
    stepIndex,
    isPlaying,
    modeEnabled,
    followAppearing,
    showOrderOfOpening,
    modeDisabled,
  ])

  useEffect(() => {
    if (active) {
      if (openRef.current) return

      openRef.current = true
      setPanel({
        stations,
        stepIndex,
        isPlaying,
        modeEnabled,
        followAppearing,
        showOrderOfOpening,
        modeDisabled,
      })
      setOpen(true)
      setVisible(false)

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        setVisible(true)
        return
      }

      let innerFrame = 0
      const outerFrame = window.requestAnimationFrame(() => {
        innerFrame = window.requestAnimationFrame(() => setVisible(true))
      })

      return () => {
        window.cancelAnimationFrame(outerFrame)
        window.cancelAnimationFrame(innerFrame)
      }
    }

    if (!openRef.current) return

    setVisible(false)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timeoutId = window.setTimeout(
      () => {
        openRef.current = false
        setOpen(false)
        setPanel(null)
      },
      prefersReducedMotion ? 0 : TIMELINE_FLOAT_MOTION_MS
    )

    return () => window.clearTimeout(timeoutId)
    // Enter/exit is keyed on `active` only — content sync is handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- presence animation
  }, [active])

  if (!open || !panel) return null

  return (
    <div
      className={[
        'stations-map-float',
        'stations-map-float--timeline',
        visible ? 'stations-map-float--timeline-visible' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!visible || undefined}
    >
      <StationsMapTimeline
        stations={panel.stations}
        stepIndex={panel.stepIndex}
        onStepIndexChange={onStepIndexChange}
        isPlaying={panel.isPlaying}
        onPlayingChange={onPlayingChange}
        modeEnabled={panel.modeEnabled}
        onModeEnabledChange={onModeEnabledChange}
        followAppearing={panel.followAppearing}
        onFollowAppearingChange={onFollowAppearingChange}
        showOrderOfOpening={panel.showOrderOfOpening}
        modeDisabled={panel.modeDisabled}
        modeDisabledMessage={modeDisabledMessage}
        modeDisabledAriaLabel={modeDisabledAriaLabel}
      />
    </div>
  )
}
