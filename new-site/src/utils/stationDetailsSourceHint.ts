import type { StationDetailsTab } from './stationCollectionFieldSchema'

export const STATION_DETAILS_LOCATION_SOURCE_HINT =
  'The data shown on this page was sourced and is currently being reviewed by Rail Statistics.'

export const STATION_DETAILS_USAGE_SOURCE_HINT =
  'The data shown on this page is sourced from the Office for Rail and Road (ORR) for station usage'

export type StationDetailsSourceHintOptions = {
  showKnowledgebaseTab: boolean
  knowledgebaseLastUpdatedLabel?: string | null
  knowledgebaseDetailsSourceHint?: string | null
}

/**
 * Attribution line for the active station-details section (header or section top).
 */
export function resolveStationDetailsSourceHint(
  tab: StationDetailsTab | undefined,
  options: StationDetailsSourceHintOptions
): string | null {
  if (!tab) return null

  if (tab === 'location') return STATION_DETAILS_LOCATION_SOURCE_HINT
  if (tab === 'usage') return STATION_DETAILS_USAGE_SOURCE_HINT

  if (tab === 'details') {
    if (!options.showKnowledgebaseTab) return null
    return options.knowledgebaseDetailsSourceHint?.trim() || null
  }

  if (!options.showKnowledgebaseTab) return null
  return options.knowledgebaseLastUpdatedLabel?.trim() || null
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
