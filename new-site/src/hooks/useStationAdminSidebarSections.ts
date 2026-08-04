import { useCallback, useEffect, useState } from 'react'
import {
  readStationAdminSidebarSections,
  writeStationAdminSidebarSections,
  STATION_ADMIN_SIDEBAR_SECTIONS_CHANGED_EVENT,
  type StationAdminSidebarSectionId,
  type StationAdminSidebarSectionsState,
} from '@/utils/stationAdminSidebarSectionsStorage'

export function useStationAdminSidebarSections(
  ssrFallback: StationAdminSidebarSectionsState
): {
  sections: StationAdminSidebarSectionsState
  setSectionExpanded: (id: StationAdminSidebarSectionId, expanded: boolean) => void
} {
  // Always start from the SSR snapshot so server HTML and the first client render match.
  // localStorage is applied after mount (and kept in sync via the change event).
  const [sections, setSections] = useState<StationAdminSidebarSectionsState>(ssrFallback)

  useEffect(() => {
    setSections(readStationAdminSidebarSections())

    const handleChange = () => {
      setSections(readStationAdminSidebarSections())
    }
    window.addEventListener(STATION_ADMIN_SIDEBAR_SECTIONS_CHANGED_EVENT, handleChange)
    return () =>
      window.removeEventListener(STATION_ADMIN_SIDEBAR_SECTIONS_CHANGED_EVENT, handleChange)
  }, [])

  const setSectionExpanded = useCallback(
    (id: StationAdminSidebarSectionId, expanded: boolean) => {
      setSections((current) => {
        const next = { ...current, [id]: expanded }
        writeStationAdminSidebarSections(next)
        return next
      })
    },
    []
  )

  return { sections, setSectionExpanded }
}
