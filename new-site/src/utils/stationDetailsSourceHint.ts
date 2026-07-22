import type { NetworkCollectionId } from '../constants/stationCollections'
import { isNetworkCollection, NETWORK_LABELS } from '../constants/stationCollections'
import type { StationDetailsTab } from './stationCollectionFieldSchema'

/** Default attribution when data is Rail Statistics–sourced and under review. */
export const STATION_DETAILS_REVIEWED_SOURCE_HINT =
  'The data shown on this page was sourced and is currently being reviewed by Rail Statistics.'

/** Alias used by Location (and tests); same copy as STATION_DETAILS_REVIEWED_SOURCE_HINT. */
export const STATION_DETAILS_LOCATION_SOURCE_HINT = STATION_DETAILS_REVIEWED_SOURCE_HINT

export const STATION_DETAILS_USAGE_SOURCE_HINT =
  'The data shown on this page is sourced from the Office for Rail and Road (ORR) for station usage'

export const STATION_DETAILS_SUPERTRAM_SOURCE_HINT =
  'The data shown on this page was sourced by Rail Statistics.'

/**
 * Network-specific footer attribution for station details sections.
 * GBNR Knowledgebase / ORR tabs use their own lines; this covers Location and non-KB networks.
 */
export function getStationDetailsNetworkSourceHint(
  networkId: NetworkCollectionId | null | undefined
): string {
  if (!networkId || !isNetworkCollection(networkId)) {
    return STATION_DETAILS_REVIEWED_SOURCE_HINT
  }

  if (networkId === 'lightrail_GBSHEFFSUPERTRAM') {
    return STATION_DETAILS_SUPERTRAM_SOURCE_HINT
  }

  if (networkId === 'stations_nitranslink' || networkId === 'stations_roiirerail') {
    const networkName = NETWORK_LABELS[networkId]
    return (
      `${STATION_DETAILS_REVIEWED_SOURCE_HINT} ` +
      `(Please note data for ${networkName} is limited due to a lack of information, ` +
      `if you know of additional information or APIs, you can get in touch via email to enquires@railstatistics.co.uk)`
    )
  }

  // GBNR, GB Heritage, and any future networks default to the reviewing line.
  return STATION_DETAILS_REVIEWED_SOURCE_HINT
}

export type StationDetailsSourceHintOptions = {
  showKnowledgebaseTab: boolean
  knowledgebaseLastUpdatedLabel?: string | null
  knowledgebaseDetailsSourceHint?: string | null
  /** When set, non-KB tabs and Location use the network-specific attribution line. */
  networkCollectionId?: NetworkCollectionId | null
}

/**
 * Attribution line for the active station-details section (header or section top).
 */
export function resolveStationDetailsSourceHint(
  tab: StationDetailsTab | undefined,
  options: StationDetailsSourceHintOptions
): string | null {
  if (!tab) return null

  const networkHint = getStationDetailsNetworkSourceHint(options.networkCollectionId)

  if (tab === 'location') return networkHint
  if (tab === 'usage') return STATION_DETAILS_USAGE_SOURCE_HINT

  if (tab === 'details') {
    if (options.showKnowledgebaseTab) {
      return options.knowledgebaseDetailsSourceHint?.trim() || null
    }
    return networkHint
  }

  if (options.showKnowledgebaseTab) {
    return options.knowledgebaseLastUpdatedLabel?.trim() || null
  }
  return networkHint
}

/**
 * Split an attribution hint onto new lines after each sentence-ending period.
 * Keeps the trailing "." with the sentence.
 */
export function splitStationDetailsSourceHintLines(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const parts = trimmed
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [trimmed]
}
