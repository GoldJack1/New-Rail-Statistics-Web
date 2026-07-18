'use client'

import React from 'react'
import TextCard from '@/components/cards/TextCard/TextCard'
import './StationKnowledgebaseAlertBanner.css'

interface StationKnowledgebaseAlertBannerProps {
  alertText: string
}

/**
 * Knowledgebase StationAlerts — shown at the top of station details when present.
 */
export function StationKnowledgebaseAlertBanner({ alertText }: StationKnowledgebaseAlertBannerProps) {
  const trimmed = alertText.trim()
  if (!trimmed) return null

  return (
    <div className="kb-station-alert-banner" role="status" aria-label="Station alert">
      <TextCard
        title="Station alert"
        description={trimmed}
        state="default"
        trailingIcon={<span aria-hidden="true" />}
        className="kb-station-alert-banner__card"
        ariaLabel="Station alert"
      />
    </div>
  )
}

export default StationKnowledgebaseAlertBanner
