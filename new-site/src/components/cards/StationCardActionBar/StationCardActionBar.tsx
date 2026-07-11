'use client'

import React, { useMemo, useState } from 'react'
import { Info, Star } from '@phosphor-icons/react'
import { BUTBaseButton as Button } from '../../buttons'
import VisitButton from '../../buttons/other/BUTVisitStatusButton'
import './StationCardActionBar.css'

interface StationCardActionBarProps {
  onInfoClick: () => void
}

type VisitStatus = 'visited' | 'not-visited'
const StationCardActionBar: React.FC<StationCardActionBarProps> = ({ onInfoClick }) => {
  const [visitStatus, setVisitStatus] = useState<VisitStatus>('not-visited')
  const [isFavorite, setIsFavorite] = useState(false)

  const isVisited = useMemo(() => visitStatus === 'visited', [visitStatus])

  const handleVisitToggle = () => {
    setVisitStatus((current) => (current === 'visited' ? 'not-visited' : 'visited'))
  }

  const StarIcon = (
    <Star size={16} weight={isFavorite ? 'fill' : 'regular'} aria-hidden />
  )

  const InfoIcon = <Info size={16} weight="regular" aria-hidden />

  return (
    <section
      className="rs-station-card-action-bar"
      aria-label="Station card actions"
      onClick={(event) => event.stopPropagation()}
    >
      <VisitButton
        visited={isVisited}
        onToggle={handleVisitToggle}
        disabled
        className="rs-station-card-action-bar__visit"
      />
      <Button
        variant="square"
        shape="squared"
        width="hug"
        colorVariant={isFavorite ? 'fav-action' : 'primary'}
        ariaLabel={isFavorite ? 'Remove favorite' : 'Add favorite'}
        icon={StarIcon}
        disabled
        onClick={(event) => {
          event.stopPropagation()
          setIsFavorite((current) => !current)
        }}
      />
      <Button
        variant="square"
        shape="squared"
        width="hug"
        colorVariant="primary"
        ariaLabel="View station details"
        icon={InfoIcon}
        onClick={(event) => {
          event.stopPropagation()
          onInfoClick()
        }}
      />
    </section>
  )
}

export default StationCardActionBar
