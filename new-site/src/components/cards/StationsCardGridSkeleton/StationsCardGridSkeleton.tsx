'use client'

import React from 'react'
import StationCardSkeleton from '../StationCardSkeleton/StationCardSkeleton'

interface StationsCardGridSkeletonProps {
  count: number
}

const StationsCardGridSkeleton: React.FC<StationsCardGridSkeletonProps> = ({ count }) => (
  <div className="stations-page-grid" aria-busy="true" aria-label="Loading stations">
    {Array.from({ length: count }, (_, index) => (
      <StationCardSkeleton key={`station-card-skeleton-${index}`} />
    ))}
  </div>
)

export default StationsCardGridSkeleton
