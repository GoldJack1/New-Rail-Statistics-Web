'use client'

import dynamic from 'next/dynamic'
import StationsCardGridSkeleton from '@/components/cards/StationsCardGridSkeleton/StationsCardGridSkeleton'
import type { NetworkViewFilter } from '@/constants/stationCollections'
import type { StationAdminDisplayMode } from '@/utils/stationAdminDisplayModeStorage'
import type { StationAdminSidebarSectionsState } from '@/utils/stationAdminSidebarSectionsStorage'

const StationsPageClient = dynamic(() => import('@/app/admin/stations/StationsPageClient'), {
  loading: () => (
    <div className="stations-page" aria-busy="true" aria-label="Loading stations">
      <StationsCardGridSkeleton count={24} />
    </div>
  ),
})

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
