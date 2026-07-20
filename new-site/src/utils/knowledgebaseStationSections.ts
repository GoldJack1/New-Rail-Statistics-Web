import type { KbJson } from './knowledgebaseStationXml'
import { sanitizeKbDisplayText } from './knowledgebaseDisplayText'

export type KnowledgebaseStationSection = {
  key: string
  label: string
  value: KbJson
}

const OVERVIEW_KEY = '__overview__'
export const KNOWLEDGEBASE_OVERVIEW_KEY = OVERVIEW_KEY
const OVERVIEW_LABEL = 'KB not-used'

/** Combined sidebar section for Staffing + StationFacilities. */
export const FACILITIES_STAFFING_KEY = 'FacilitiesAndStaffing'
const FACILITIES_STAFFING_LABEL = 'Facilities & Staffing'
const FACILITIES_STAFFING_SOURCE_KEYS = ['Staffing', 'StationFacilities'] as const

/** Preferred sidebar order for known KB StationV4 top-level keys. */
const SECTION_ORDER = [
  OVERVIEW_KEY,
  FACILITIES_STAFFING_KEY,
  'Accessibility',
  'Fares',
  'PassengerServices',
  'Interchange',
]

/** Scalars grouped under the unused/overview sidebar section (StationOperator is TOC CODE in Details). */
const SCALAR_OVERVIEW_KEYS = new Set([
  'CrsCode',
  'Name',
  'SixteenCharacterName',
  'Longitude',
  'Latitude',
])

/** Keys omitted from sidebar sections entirely (surfaced elsewhere in the UI). */
const OMIT_FROM_SECTIONS = new Set([
  'StationOperator',
  'Address',
  'AlternativeIdentifiers',
  'StationAlerts',
])

/** Object sections folded into KB not-used instead of their own sidebar tab. */
const OBJECT_OVERVIEW_KEYS = new Set(['TrainOperatingCompanies', 'ChangeHistory'])

function isPlainObject(value: KbJson): value is { [key: string]: KbJson } {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asTrimmedString(value: KbJson): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function collectAddressLines(value: KbJson): string[] {
  if (typeof value === 'string') {
    const line = asTrimmedString(value)
    return line ? [line] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectAddressLines(entry))
  }
  return []
}

export function humanizeKnowledgebaseKey(key: string): string {
  if (key === OVERVIEW_KEY) return OVERVIEW_LABEL
  if (key === FACILITIES_STAFFING_KEY) return FACILITIES_STAFFING_LABEL
  if (key === 'PassengerServices') return 'Customer Services'
  if (key === 'CCTV' || key === 'Cctv' || key === 'ClosedCircuitTelevision') return 'CCTV'
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
}

export function unwrapKnowledgebaseStationRoot(data: KbJson): Record<string, KbJson> | null {
  if (!isPlainObject(data)) return null
  const keys = Object.keys(data)
  if (keys.length === 1 && isPlainObject(data[keys[0]])) {
    return data[keys[0]] as Record<string, KbJson>
  }
  return data
}

export function readKnowledgebaseStationOperator(data: KbJson): string | null {
  const root = unwrapKnowledgebaseStationRoot(data)
  if (!root) return null
  const value = root.StationOperator
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** KB NationalLocationCode (usually under AlternativeIdentifiers). */
export function readKnowledgebaseNlc(data: KbJson): string | null {
  const root = unwrapKnowledgebaseStationRoot(data)
  if (!root) return null

  const fromAlt = (() => {
    const alt = root.AlternativeIdentifiers
    if (!isPlainObject(alt)) return null
    return asTrimmedString(alt.NationalLocationCode)
  })()
  if (fromAlt) return fromAlt

  return asTrimmedString(root.NationalLocationCode)
}

function stripHtmlToText(input: string): string {
  return sanitizeKbDisplayText(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  )
}

function collectAlertTexts(value: KbJson): string[] {
  if (typeof value === 'string') {
    const text = stripHtmlToText(value)
    return text ? [text] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectAlertTexts(entry))
  }
  if (isPlainObject(value)) {
    if (value.AlertText != null) return collectAlertTexts(value.AlertText)
    if (typeof value['#text'] === 'string') return collectAlertTexts(value['#text'])
  }
  return []
}

/**
 * StationAlerts/AlertText as plain text for the details-page banner.
 * Returns null when there is no usable alert.
 */
export function formatKnowledgebaseStationAlert(data: KbJson): string | null {
  const root = unwrapKnowledgebaseStationRoot(data)
  if (!root) return null
  const alerts = root.StationAlerts
  if (alerts == null) return null
  const texts = collectAlertTexts(alerts)
  const formatted = texts.join('\n\n').trim()
  return formatted || null
}

function dayOrdinal(day: number): string {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

/**
 * ChangeHistory/LastChangedDate → "16th July 2026 at 09:46" (24h, UTC).
 */
function formatKnowledgebaseLastChangedStamp(data: KbJson): string | null {
  const root = unwrapKnowledgebaseStationRoot(data)
  if (!root) return null
  const history = root.ChangeHistory
  if (!isPlainObject(history)) return null
  const raw = asTrimmedString(history.LastChangedDate)
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null

  const day = date.getUTCDate()
  const month = date.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })
  const year = date.getUTCFullYear()
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${dayOrdinal(day)} ${month} ${year} at ${hours}:${minutes}`
}

/**
 * ChangeHistory/LastChangedDate →
 * "The data shown on this page was last updated by National Rail Enquiries on 16th July 2026 at 09:46." (24h, UTC).
 */
export function formatKnowledgebaseLastUpdatedLabel(data: KbJson): string | null {
  const stamp = formatKnowledgebaseLastChangedStamp(data)
  if (!stamp) return null
  return `The data shown on this page was last updated by National Rail Enquiries on ${stamp}.`
}

/**
 * Details tab source line (Firebase + KB mix).
 * "Some data shown on this page was last updated by National Rail Enquiries on 16th July 2026 at 09:46. With a large majority of data being added by Rail Statistics."
 */
export function formatKnowledgebaseDetailsSourceHint(data: KbJson): string | null {
  const stamp = formatKnowledgebaseLastChangedStamp(data)
  if (!stamp) return null
  return `Some data shown on this page was last updated by National Rail Enquiries on ${stamp}. With a large majority of data being added by Rail Statistics.`
}

/**
 * Format KB Address/PostalAddress/A_5LineAddress as a multi-line postal string.
 * Returns null when no usable lines/postcode are present.
 */
export function formatKnowledgebasePostalAddress(data: KbJson): string | null {
  const root = unwrapKnowledgebaseStationRoot(data)
  if (!root) return null
  const address = root.Address
  if (!isPlainObject(address)) return null
  const postal = isPlainObject(address.PostalAddress) ? address.PostalAddress : address
  const fiveLine = isPlainObject(postal.A_5LineAddress) ? postal.A_5LineAddress : postal
  if (!isPlainObject(fiveLine)) return null

  const lines = collectAddressLines(fiveLine.Line)
  const postCode = asTrimmedString(fiveLine.PostCode)
  if (postCode) lines.push(postCode)

  const formatted = lines.join('\n').trim()
  return formatted || null
}

/**
 * Move ClosedCircuitTelevision / CCTV from Staffing into StationFacilities for display.
 */
function relocateCctvIntoFacilities(merged: Record<string, KbJson>): Record<string, KbJson> {
  const staffingRaw = merged.Staffing
  if (!isPlainObject(staffingRaw)) return merged

  const staffing = { ...staffingRaw }
  const cctv =
    staffing.ClosedCircuitTelevision !== undefined
      ? staffing.ClosedCircuitTelevision
      : staffing.CCTV !== undefined
        ? staffing.CCTV
        : undefined
  if (cctv === undefined) return merged

  delete staffing.ClosedCircuitTelevision
  delete staffing.CCTV

  const facilitiesRaw = merged.StationFacilities
  const facilities = isPlainObject(facilitiesRaw) ? { ...facilitiesRaw } : {}
  if (facilities.ClosedCircuitTelevision === undefined && facilities.CCTV === undefined) {
    facilities.ClosedCircuitTelevision = cctv
  }

  const next: Record<string, KbJson> = { ...merged }
  if (Object.keys(staffing).length > 0) next.Staffing = staffing
  else delete next.Staffing
  next.StationFacilities = facilities
  return next
}

/**
 * Fold InformationSystems into PassengerServices (Customer Services tab).
 */
function redistributeInformationSystems(root: Record<string, KbJson>): Record<string, KbJson> {
  const next: Record<string, KbJson> = { ...root }
  const infoRaw = next.InformationSystems
  if (!isPlainObject(infoRaw)) return next

  const passengerRaw = next.PassengerServices
  const passenger = isPlainObject(passengerRaw) ? { ...passengerRaw } : {}
  for (const [key, value] of Object.entries(infoRaw)) {
    if (passenger[key] === undefined) passenger[key] = value
  }
  next.PassengerServices = passenger

  delete next.InformationSystems
  return next
}

/** Internal Fares/CMS fields shown under Admin → KB not-used, not the Fares tab. */
const FARES_TO_OVERVIEW_KEYS = new Set(['AlwaysShowOysterCardFields', 'PenaltyFares'])

function relocateFaresAdminFields(
  root: Record<string, KbJson>,
  overview: Record<string, KbJson>
): Record<string, KbJson> {
  const faresRaw = root.Fares
  if (!isPlainObject(faresRaw)) return root

  const fares = { ...faresRaw }
  let changed = false
  for (const key of FARES_TO_OVERVIEW_KEYS) {
    if (key in fares) {
      overview[key] = fares[key]
      delete fares[key]
      changed = true
    }
  }
  if (!changed) return root
  return { ...root, Fares: fares }
}

/**
 * Split a parsed StationV4 payload into sidebar sections.
 * Scalar identity fields are grouped under "KB not-used"; object/array keys get their own tab.
 * StationOperator, Address, AlternativeIdentifiers (NLC), and StationAlerts are omitted —
 * shown on Details / Location / alert banner instead.
 * Staffing + StationFacilities are merged into one "Facilities & Staffing" tab.
 * CCTV (ClosedCircuitTelevision) is shown under StationFacilities, not Staffing.
 * CIS, InformationAvailableFromStaff, DepartureScreens, Announcements, and other
 * InformationSystems fields → PassengerServices (Customer Services).
 * TrainOperatingCompanies / ChangeHistory → KB not-used.
 * AlwaysShowOysterCardFields / PenaltyFares → KB not-used (Admin tab), not Fares.
 */
export function extractKnowledgebaseStationSections(data: KbJson): KnowledgebaseStationSection[] {
  const root = unwrapKnowledgebaseStationRoot(data)
  if (!root) return []

  const overview: Record<string, KbJson> = {}
  const sections: KnowledgebaseStationSection[] = []
  const facilitiesAndStaffing: Record<string, KbJson> = {}
  const redistributed = relocateFaresAdminFields(redistributeInformationSystems(root), overview)

  for (const [key, value] of Object.entries(redistributed)) {
    if (OMIT_FROM_SECTIONS.has(key)) continue
    if ((FACILITIES_STAFFING_SOURCE_KEYS as readonly string[]).includes(key)) {
      facilitiesAndStaffing[key] = value
      continue
    }
    if (OBJECT_OVERVIEW_KEYS.has(key)) {
      overview[key] = value
      continue
    }
    if (SCALAR_OVERVIEW_KEYS.has(key) || typeof value !== 'object' || value === null) {
      overview[key] = value
      continue
    }
    sections.push({
      key,
      label: humanizeKnowledgebaseKey(key),
      value,
    })
  }

  if (Object.keys(facilitiesAndStaffing).length > 0) {
    const relocated = relocateCctvIntoFacilities(facilitiesAndStaffing)
    // Stable nested order: Staffing first, then StationFacilities.
    const ordered: Record<string, KbJson> = {}
    for (const key of FACILITIES_STAFFING_SOURCE_KEYS) {
      if (key in relocated) ordered[key] = relocated[key]
    }
    for (const [key, value] of Object.entries(relocated)) {
      if (!(key in ordered)) ordered[key] = value
    }
    sections.push({
      key: FACILITIES_STAFFING_KEY,
      label: FACILITIES_STAFFING_LABEL,
      value: ordered,
    })
  }

  if (Object.keys(overview).length > 0) {
    sections.unshift({
      key: OVERVIEW_KEY,
      label: OVERVIEW_LABEL,
      value: overview,
    })
  }

  const orderIndex = new Map(SECTION_ORDER.map((key, index) => [key, index]))
  sections.sort((a, b) => {
    const ai = orderIndex.get(a.key) ?? 1000
    const bi = orderIndex.get(b.key) ?? 1000
    if (ai !== bi) return ai - bi
    return a.label.localeCompare(b.label)
  })

  return sections
}

export function toKnowledgebaseTabId(sectionKey: string): `kb:${string}` {
  return `kb:${sectionKey}`
}

export function parseKnowledgebaseTabId(tab: string): string | null {
  if (!tab.startsWith('kb:')) return null
  const key = tab.slice(3)
  return key || null
}

export function isKnowledgebaseTabId(tab: string): tab is `kb:${string}` {
  return tab.startsWith('kb:')
}
