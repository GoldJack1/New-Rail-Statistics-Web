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

/**
 * Stored `dateOpened` normalised to `dd/mm/yyyy`. Free-text values such as
 * `late 2027` are kept as written so approximate openings can be shown.
 */
function formatOpenedOn(dateOpened: Station['dateOpened']): string {
  const trimmed = dateOpened?.trim()
  if (!trimmed) return ''
  return isoDateToDdMmYyyy(storedDateToIsoDate(trimmed)) || trimmed
}

export interface NewestStationsHeroItem {
  /** Eyebrow above the card, e.g. `Newest station`. Omit to show the date caption alone. */
  label?: string
  station: Station
  /** Caption before the station date (default: `OPENED`). */
  datePrefix?: string
  /** Disable card navigation for placeholder records. */
  interactive?: boolean
}

export interface NewestStationsHeroProps {
  /** Plain string or JSX (e.g. with `<br />` for intentional line breaks). */
  title: ReactNode
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
          {items.map(({ label, station, datePrefix, interactive = true }) => {
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
            const labelText = label?.trim() ?? ''
            const showDateCaption = Boolean(openedOn || datePrefix)
            const resolvedDatePrefix = datePrefix ?? 'OPENED'

            return (
              <li
                key={`${labelText}-${station.id}`}
                className={[
                  'rs-newest-stations-hero__card',
                  interactive ? '' : 'rs-newest-stations-hero__card--non-interactive',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-disabled={interactive ? undefined : true}
              >
                {labelText || showDateCaption ? (
                  <p className="rs-newest-stations-hero__card-label">
                    {labelText ? (
                      <span className="rs-newest-stations-hero__card-label-name">
                        {showDateCaption ? `${labelText}:` : labelText}
                      </span>
                    ) : null}
                    {showDateCaption ? (
                      <span className="rs-newest-stations-hero__card-label-date">
                        {resolvedDatePrefix}
                        {openedOn ? ` ${openedOn}` : ''}
                      </span>
                    ) : null}
                  </p>
                ) : null}
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
