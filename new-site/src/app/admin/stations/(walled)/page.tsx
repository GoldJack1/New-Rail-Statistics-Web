import { cookies } from 'next/headers'
import StationsPageClient from '../StationsPageClient'
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

export default async function AdminStationsPage() {
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
    <StationsPageClient
      surface="admin"
      initialDisplayMode={initialDisplayMode}
      initialNetworkView={initialNetworkView}
      initialSidebarSections={initialSidebarSections}
    />
  )
}
