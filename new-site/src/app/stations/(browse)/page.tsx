import { cookies } from 'next/headers'
import StationsPageClient from '../../admin/stations/StationsPageClient'
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

/** Public stations list. The admin surface lives at `/admin/stations`. */
export default async function StationsPage() {
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
      surface="public"
      initialDisplayMode={initialDisplayMode}
      initialNetworkView={initialNetworkView}
      initialSidebarSections={initialSidebarSections}
    />
  )
}
