'use client'

import React from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import StationCard from '../../cards/StationCard/StationCard'
import LightRailStopCard from '../../cards/LightRailStopCard/LightRailStopCard'
import type { HeroTitleHeadingLevel } from '../HeroSlideCopy'
import type { Station } from '../../../types'
import { buildStationPath } from '../../../utils/stationAreaSlug'
import { formatStationLocationDisplay } from '../../../utils/formatStationLocation'
import { isLightRailStop } from '../../../utils/stationCardForNetwork'
import { isoDateToDdMmYyyy, storedDateToIsoDate } from '../../../utils/dateDdMmYyyy'
import './NewestStationsHero.css'

/** Stored `dateOpened` normalised to `dd/mm/yyyy`; empty when missing or unparseable. */
function formatOpenedOn(dateOpened: Station['dateOpened']): string {
  if (!dateOpened?.trim()) return ''
  return isoDateToDdMmYyyy(storedDateToIsoDate(dateOpened))
}

export interface NewestStationsHeroItem {
  /** Eyebrow above the card, e.g. `Newest station`. */
  label: string
  station: Station
  /** Caption before the station date (default: `OPENED`). */
  datePrefix?: string
  /** Disable card navigation for placeholder records. */
  interactive?: boolean
}

export interface NewestStationsHeroProps {
  title: string
  body?: ReactNode
  items: NewestStationsHeroItem[]
  /** `aria-label` on the region (default: Newest stations). */
  ariaLabel?: string
  titleHeadingLevel?: HeroTitleHeadingLevel
}

const NewestStationsHero: React.FC<NewestStationsHeroProps> = ({
  title,
  body,
  items,
  ariaLabel = 'Newest stations',
  titleHeadingLevel = 2,
}) => {
  const router = useRouter()
  const TitleTag = `h${titleHeadingLevel}` as const

  if (items.length === 0) return null

  return (
    <section className="rs-newest-stations-hero" aria-label={ariaLabel}>
      <div className="rs-newest-stations-hero__inner">
        <div className="rs-newest-stations-hero__copy">
          <TitleTag className="rs-newest-stations-hero__title">{title}</TitleTag>
          {body ? <div className="rs-newest-stations-hero__body">{body}</div> : null}
        </div>

        <ul className="rs-newest-stations-hero__cards">
          {items.map(({ label, station, datePrefix = 'OPENED', interactive = true }) => {
            const openStation = () => {
              if (interactive) router.push(`/stations/${buildStationPath(station)}`)
            }
            const cardProps = {
              station,
              locationDisplay: formatStationLocationDisplay(station),
              onCardClick: openStation,
              onInfoClick: openStation,
              actionsDisabled: !interactive,
            }
            const openedOn = formatOpenedOn(station.dateOpened)

            return (
              <li
                key={`${label}-${station.id}`}
                className={[
                  'rs-newest-stations-hero__card',
                  interactive ? '' : 'rs-newest-stations-hero__card--non-interactive',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-disabled={interactive ? undefined : true}
              >
                <p className="rs-newest-stations-hero__card-label">
                  <span className="rs-newest-stations-hero__card-label-name">
                    {openedOn ? `${label}:` : label}
                  </span>
                  {openedOn ? (
                    <span className="rs-newest-stations-hero__card-label-date">
                      {datePrefix} {openedOn}
                    </span>
                  ) : null}
                </p>
                {isLightRailStop(station) ? (
                  <LightRailStopCard {...cardProps} />
                ) : (
                  <StationCard {...cardProps} />
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default NewestStationsHero
