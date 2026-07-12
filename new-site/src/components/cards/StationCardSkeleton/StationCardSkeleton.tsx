'use client'

import React from 'react'
import { Skeleton } from '@/components/misc/Skeleton/Skeleton'
import '../StationCard/StationCard.css'
import '../StationCardActionBar/StationCardActionBar.css'
import './StationCardSkeleton.css'

const StationCardSkeleton: React.FC = () => (
  <article className="rs-station-card-stack rs-station-card-skeleton" aria-hidden="true">
    <section className="rs-station-text-card rs-station-card-skeleton__text-card">
      <Skeleton
        className="rs-station-card-skeleton__operator rs-station-card-skeleton__text-line"
        style={{ height: 13, width: '5.5rem' }}
      />
      <Skeleton
        className="rs-station-card-skeleton__name rs-station-card-skeleton__text-line"
        style={{ height: 20, width: '11rem' }}
      />
      <Skeleton
        className="rs-station-card-skeleton__location rs-station-card-skeleton__text-line"
        style={{ height: 13, width: '7rem' }}
      />
    </section>
    <div className="rs-station-card-action-bar rs-station-card-skeleton__action-bar">
      <div className="rs-station-card-skeleton__action-bar-visit">
        <Skeleton
          className="rs-station-card-skeleton__action-bar-text"
          style={{ height: 13, width: '5.5rem' }}
        />
      </div>
      <div className="rs-station-card-skeleton__action-bar-button-wrap">
        <Skeleton className="rs-station-card-skeleton__action-bar-button" />
      </div>
      <div className="rs-station-card-skeleton__action-bar-button-wrap">
        <Skeleton className="rs-station-card-skeleton__action-bar-button" />
      </div>
    </div>
  </article>
)

export default StationCardSkeleton
