import { cookies } from 'next/headers'
import StationsMapPageClient from '@/app/stations/map/StationsMapPageClient'
import {
  readStationAdminSidebarSectionsFromCookie,
  STATION_ADMIN_SIDEBAR_SECTIONS_COOKIE,
} from '@/utils/stationAdminSidebarSectionsStorage'

export default async function AdminStationsMapPage() {
  const cookieStore = await cookies()
  const initialSidebarSections = readStationAdminSidebarSectionsFromCookie(
    cookieStore.get(STATION_ADMIN_SIDEBAR_SECTIONS_COOKIE)?.value
  )

  return <StationsMapPageClient initialSidebarSections={initialSidebarSections} />
}
