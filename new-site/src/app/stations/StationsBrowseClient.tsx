'use client'

import StationsPageClient from '@/app/admin/stations/StationsPageClient'
import '@/app/admin/stations/StationsPageRefactored.css'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import type { StationAdminDisplayMode } from '@/utils/stationAdminDisplayModeStorage'
import type { StationAdminSidebarSectionsState } from '@/utils/stationAdminSidebarSectionsStorage'

export interface StationsBrowseClientProps {
  initialDisplayMode: StationAdminDisplayMode
  initialNetworkView: NetworkViewFilter
  initialSidebarSections: StationAdminSidebarSectionsState
}

export default function StationsBrowseClient({
  initialDisplayMode,
  initialNetworkView,
  initialSidebarSections,
}: StationsBrowseClientProps) {
  return (
    <StationsPageClient
      initialDisplayMode={initialDisplayMode}
      initialNetworkView={initialNetworkView}
      initialSidebarSections={initialSidebarSections}
      minSkeletonMs={0}
    />
  )
}
