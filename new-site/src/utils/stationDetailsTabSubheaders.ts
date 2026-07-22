import type { StationCollectionFieldSchema, StationDetailsTab } from '@/utils/stationCollectionFieldSchema'
import { isKnowledgebaseTabId } from '@/utils/knowledgebaseStationSections'

/** Temporary: hide left-nav subsection menus until ready to ship. */
const SHOW_STATION_DETAILS_SUBHEADERS = false

type SubheaderOptions = {
  /** GBNR location shows KB postal address when present / loading. */
  showKnowledgebaseAddress?: boolean
  /** Admin “Display” source-compare toggle. */
  showSourceCompare?: boolean
}

/** DOM id for a station-details content subsection (scroll target from left nav). */
export function stationDetailsSubsectionId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `station-details-subsection--${slug || 'section'}`
}

/**
 * Content subsection titles shown under each left-nav section on station details.
 * Mirrors StationDetailsSubsection titles in StationDetailsView.
 */
export function getStationDetailsTabSubheaders(
  tabId: StationDetailsTab,
  fieldSchema: StationCollectionFieldSchema,
  options: SubheaderOptions = {}
): string[] {
  if (!SHOW_STATION_DETAILS_SUBHEADERS) return []
  if (isKnowledgebaseTabId(tabId)) return []

  switch (tabId) {
    case 'details': {
      const headers = ['Place']
      if (fieldSchema.showStepFreeSection && fieldSchema.stepFreeInDetails) {
        headers.push('Access')
      }
      return headers
    }
    case 'location': {
      const headers: string[] = []
      if (fieldSchema.showKnowledgebaseTab && options.showKnowledgebaseAddress) {
        headers.push('Address')
      }
      headers.push('Coordinates', 'Map')
      return headers
    }
    case 'additional':
      return ['Identifiers']
    case 'service': {
      if (fieldSchema.isLightRail) {
        const headers = ['Service']
        if (fieldSchema.showConnectionBus || fieldSchema.showConnectionTrain) {
          headers.push('Connections')
        }
        return headers
      }
      const headers: string[] = []
      if (
        fieldSchema.showConnectionBus ||
        fieldSchema.showConnectionTaxi ||
        fieldSchema.showConnectionUnderground
      ) {
        headers.push('Modes')
      }
      if (fieldSchema.showStationStatusSection) headers.push('Status')
      if (
        fieldSchema.showStaffingLevel ||
        fieldSchema.showRequestStop ||
        fieldSchema.showLimitedService
      ) {
        headers.push('Operations')
      }
      return headers
    }
    case 'usage':
      return ['Graph view', 'Data view']
    case 'stepFree': {
      const headers: string[] = []
      if (fieldSchema.showStepFreeSection && !fieldSchema.stepFreeInDetails) {
        headers.push('Access')
      } else if (fieldSchema.showLiftSection && fieldSchema.isLightRail) {
        headers.push('Access')
      }
      if (fieldSchema.showLiftSection && !fieldSchema.isLightRail) headers.push('Availability')
      return headers
    }
    case 'facilities': {
      const headers: string[] = []
      if (fieldSchema.showToiletsSection) headers.push('Facilities')
      if (fieldSchema.facilityKeys.length > 0) headers.push('Amenities')
      return headers
    }
    case 'admin': {
      const headers = ['Identifiers']
      if (fieldSchema.showKnowledgebaseTab && options.showSourceCompare) {
        headers.push('Display')
      }
      return headers
    }
    default:
      return []
  }
}
