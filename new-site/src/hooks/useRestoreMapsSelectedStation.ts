'use client'

import { useEffect, useRef } from 'react'
import type { Station } from '@/types'
import { getStationMapKey } from '@/utils/stationAreaSlug'
import {
  readMapsSelectedStationKey,
  writeMapsSelectedStationKey,
} from '@/utils/mapsSelectedStationStorage'

/**
 * Re-select the pin that was active before navigating to station details
 * (map remounts wipe React selection state). Cleared by callers when the
 * user clicks the map or another pin.
 */
export function useRestoreMapsSelectedStation(options: {
  dataReady: boolean
  mapStations: Station[]
  selectedStation: Station | null
  onRestore: (station: Station) => void
}): void {
  const { dataReady, mapStations, selectedStation, onRestore } = options
  const attemptedRef = useRef(false)
  const onRestoreRef = useRef(onRestore)
  onRestoreRef.current = onRestore

  useEffect(() => {
    if (attemptedRef.current || !dataReady || selectedStation) return

    const key = readMapsSelectedStationKey()
    if (!key) {
      attemptedRef.current = true
      return
    }

    // Wait until stations are available so we don't wipe a valid key on an empty first paint.
    if (mapStations.length === 0) return

    const station = mapStations.find((candidate) => getStationMapKey(candidate) === key)
    attemptedRef.current = true
    if (station) {
      onRestoreRef.current(station)
      return
    }
    writeMapsSelectedStationKey(null)
  }, [dataReady, mapStations, selectedStation])
}
