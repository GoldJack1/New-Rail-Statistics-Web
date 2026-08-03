'use client'

import { useEffect, useRef, useState } from 'react'
import StationsMapSelectedPanel from './StationsMapSelectedPanel'
import type { Station } from '@/types'

const SELECTED_CARD_MOTION_MS = 280

interface StationsMapSelectedCardFloatProps {
  station: Station | null
  isPendingNew?: boolean
  detailsLoading?: boolean
}

/**
 * Selected station/stop card with slide-up enter and slide-down exit.
 * Keeps the card mounted through the exit so the reverse animation can play.
 */
export default function StationsMapSelectedCardFloat({
  station,
  isPendingNew = false,
  detailsLoading = false,
}: StationsMapSelectedCardFloatProps) {
  const openRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [panel, setPanel] = useState<{
    station: Station
    isPendingNew: boolean
    detailsLoading: boolean
  } | null>(null)

  // Keep panel content in sync while open (does not drive enter/exit).
  useEffect(() => {
    if (!station) return
    setPanel({ station, isPendingNew, detailsLoading })
  }, [station, isPendingNew, detailsLoading])

  // Enter / exit presence — depends only on whether a station is selected.
  useEffect(() => {
    if (station) {
      if (openRef.current) return

      openRef.current = true
      setPanel({
        station,
        isPendingNew,
        detailsLoading,
      })
      setOpen(true)
      setVisible(false)

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        setVisible(true)
        return
      }

      // Two frames so the closed transform paints before we transition open.
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
      prefersReducedMotion ? 0 : SELECTED_CARD_MOTION_MS
    )

    return () => window.clearTimeout(timeoutId)
    // intentionally only station presence — loading flags must not restart enter
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enter/exit keyed on station identity
  }, [station])

  if (!open || !panel) return null

  return (
    <div
      className={[
        'stations-map-float',
        'stations-map-float--selected',
        visible ? 'stations-map-float--selected-visible' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <StationsMapSelectedPanel
        station={panel.station}
        isPendingNew={panel.isPendingNew}
        detailsLoading={panel.detailsLoading}
      />
    </div>
  )
}
