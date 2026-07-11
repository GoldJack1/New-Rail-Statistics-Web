'use client'

import type { IconProps, IconWeight } from '@phosphor-icons/react'
import {
  ChartDonut,
  ListMagnifyingGlass,
  MapPinSimple,
  MapTrifold,
  Ticket,
} from '@phosphor-icons/react'

type RailIconProps = IconProps

/** Phosphor MapPinSimple — RS Station Pin */
export function StationPinIcon(props: RailIconProps) {
  return <MapPinSimple {...props} />
}

/** Phosphor ListMagnifyingGlass — RS Stations List */
export function StationsListIcon(props: RailIconProps) {
  return <ListMagnifyingGlass {...props} />
}

/** Phosphor ChartDonut — RS Statistics */
export function StatisticsIcon(props: RailIconProps) {
  return <ChartDonut {...props} />
}

/** Phosphor Ticket — RS Tickets */
export function TicketsIcon(props: RailIconProps) {
  return <Ticket {...props} />
}

/** Phosphor MapTrifold — RS Map Detailed */
export function MapDetailedIcon(props: RailIconProps) {
  return <MapTrifold {...props} />
}

export const RAIL_PHOSPHOR_ICONS = [
  { name: 'Station Pin', phosphor: 'MapPinSimple', Icon: StationPinIcon },
  { name: 'Stations List', phosphor: 'ListMagnifyingGlass', Icon: StationsListIcon },
  { name: 'Statistics', phosphor: 'ChartDonut', Icon: StatisticsIcon },
  { name: 'Tickets', phosphor: 'Ticket', Icon: TicketsIcon },
  { name: 'Map Detailed', phosphor: 'MapTrifold', Icon: MapDetailedIcon },
] as const

export type { IconWeight }
