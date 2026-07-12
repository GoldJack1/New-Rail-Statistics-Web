import { useEffect, useState } from 'react'
import {
  readStationAdminDisplayMode,
  STATION_ADMIN_DISPLAY_MODE_CHANGED_EVENT,
  type StationAdminDisplayMode,
} from '@/utils/stationAdminDisplayModeStorage'

export function useStationAdminDisplayMode(
  ssrFallback: StationAdminDisplayMode = 'cards'
): StationAdminDisplayMode {
  const [, setRevision] = useState(0)

  useEffect(() => {
    const handleChange = () => setRevision((current) => current + 1)
    window.addEventListener(STATION_ADMIN_DISPLAY_MODE_CHANGED_EVENT, handleChange)
    return () => window.removeEventListener(STATION_ADMIN_DISPLAY_MODE_CHANGED_EVENT, handleChange)
  }, [])

  if (typeof window !== 'undefined') {
    return readStationAdminDisplayMode()
  }

  return ssrFallback
}
