import { cookies } from 'next/headers'
import StationsBrowseClient from './StationsBrowseClient'
import {
  readStationNetworkViewFromCookie,
  STATION_NETWORK_VIEW_COOKIE,
} from '@/constants/stationCollections'
import {
  STATION_ADMIN_DISPLAY_MODE_COOKIE,
  type StationAdminDisplayMode,
} from '@/utils/stationAdminDisplayModeStorage'
import {
  readStationAdminSidebarSectionsFromCookie,
  STATION_ADMIN_SIDEBAR_SECTIONS_COOKIE,
} from '@/utils/stationAdminSidebarSectionsStorage'

/** Shared stations browse list (public read-only; admin controls appear when signed in). */
export default async function StationsBrowsePage() {
  const cookieStore = await cookies()
  const storedMode = cookieStore.get(STATION_ADMIN_DISPLAY_MODE_COOKIE)?.value
  const initialDisplayMode: StationAdminDisplayMode = storedMode === 'table' ? 'table' : 'cards'
  const initialNetworkView = readStationNetworkViewFromCookie(
    cookieStore.get(STATION_NETWORK_VIEW_COOKIE)?.value
  )
  const initialSidebarSections = readStationAdminSidebarSectionsFromCookie(
    cookieStore.get(STATION_ADMIN_SIDEBAR_SECTIONS_COOKIE)?.value
  )

  return (
    <StationsBrowseClient
      initialDisplayMode={initialDisplayMode}
      initialNetworkView={initialNetworkView}
      initialSidebarSections={initialSidebarSections}
    />
  )
}
