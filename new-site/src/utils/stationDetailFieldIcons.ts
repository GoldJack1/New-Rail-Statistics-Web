import type { Icon } from '@phosphor-icons/react'
import {
  Armchair,
  ArrowsLeftRight,
  Baby,
  Bicycle,
  Buildings,
  Car,
  ChartBar,
  Coffee,
  Compass,
  Crosshair,
  CurrencyGbp,
  Database,
  Ear,
  Envelope,
  Gear,
  Headset,
  House,
  IdentificationCard,
  ListBullets,
  MapPin,
  MapTrifold,
  Monitor,
  Package,
  Phone,
  ShoppingCart,
  Star,
  Storefront,
  Ticket,
  Toilet,
  Train,
  Users,
  VideoCamera,
  Wheelchair,
  WifiHigh,
  Wrench,
} from '@phosphor-icons/react'
import { FACILITIES_STAFFING_KEY, KNOWLEDGEBASE_OVERVIEW_KEY } from './knowledgebaseStationSections'
import type { StationDetailsTab } from './stationCollectionFieldSchema'
import { isKnowledgebaseTabId, parseKnowledgebaseTabId } from './knowledgebaseStationSections'

export function normalizeStationDetailIconKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

/** Per-field icons for facilities / services. Unmapped keys return null. */
const FIELD_ICON_BY_NORMALIZED_KEY: Record<string, Icon> = {
  wifi: WifiHigh,
  wifihigh: WifiHigh,
  parking: Car,
  carpark: Car,
  carparking: Car,
  cyclestorage: Bicycle,
  cycling: Bicycle,
  cyclehire: Bicycle,
  bicycle: Bicycle,
  ticketoffice: Ticket,
  tickets: Ticket,
  ticketmachine: Ticket,
  ticketmachines: Ticket,
  toilets: Toilet,
  toilet: Toilet,
  babychange: Baby,
  babychanging: Baby,
  waitingroom: Armchair,
  seatedarea: Armchair,
  cctv: VideoCamera,
  closedcircuittelevision: VideoCamera,
  atm: CurrencyGbp,
  atmmachine: CurrencyGbp,
  shops: Storefront,
  stationbuffet: Coffee,
  buffet: Coffee,
  refreshments: Coffee,
  telephones: Phone,
  telephone: Phone,
  helpline: Headset,
  postbox: Envelope,
  firstclasslounge: Star,
  trolleys: ShoppingCart,
  staffing: Users,
  staffinglevel: Users,
  staffed: Users,
  inductionloop: Ear,
  accessible: Wheelchair,
  stepfree: Wheelchair,
  stepfreestatus: Wheelchair,
  stepfreecategory: Wheelchair,
  stepfreeaccess: Wheelchair,
  wheelchair: Wheelchair,
  customerinformation: Monitor,
  cis: Monitor,
  informationsystems: Monitor,
  lostproperty: Package,
  leftluggage: Package,
  luggage: Package,
  informationservicesopen: Monitor,
  informationservices: Monitor,
  bus: Train,
  train: Train,
  taxi: Car,
  underground: Train,
  lift: Buildings,
  haslift: Buildings,
}

export function getStationDetailFieldIcon(keyOrLabel: string | null | undefined): Icon | null {
  if (!keyOrLabel) return null
  const normalized = normalizeStationDetailIconKey(keyOrLabel)
  if (FIELD_ICON_BY_NORMALIZED_KEY[normalized]) return FIELD_ICON_BY_NORMALIZED_KEY[normalized]
  // Prefer longer keys so short tokens like "car" don't steal unrelated matches.
  const keys = Object.keys(FIELD_ICON_BY_NORMALIZED_KEY).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (key.length < 4) continue
    if (normalized.includes(key)) return FIELD_ICON_BY_NORMALIZED_KEY[key]
  }
  return null
}

const SECTION_ICON_BY_TAB: Record<string, Icon> = {
  details: IdentificationCard,
  location: MapPin,
  usage: ChartBar,
  additional: ListBullets,
  service: Train,
  stepFree: Wheelchair,
  facilities: Buildings,
  admin: Gear,
}

/** Icons for left-nav subsection rows (titles from getStationDetailsTabSubheaders). */
const SUBSECTION_ICON_BY_TITLE: Record<string, Icon> = {
  place: MapPin,
  access: Wheelchair,
  address: House,
  coordinates: Crosshair,
  map: MapTrifold,
  identifiers: IdentificationCard,
  service: Train,
  connections: ArrowsLeftRight,
  modes: Train,
  status: Compass,
  operations: Gear,
  'graph view': ChartBar,
  'data view': Database,
  availability: Buildings,
  facilities: Toilet,
  amenities: Star,
  display: Monitor,
}

export function getStationDetailsSubsectionIcon(title: string): Icon | null {
  const key = title.trim().toLowerCase()
  if (SUBSECTION_ICON_BY_TITLE[key]) return SUBSECTION_ICON_BY_TITLE[key]
  return getStationDetailFieldIcon(title)
}

const KB_SECTION_ICON_BY_KEY: Record<string, Icon> = {
  [FACILITIES_STAFFING_KEY]: Wrench,
  Accessibility: Wheelchair,
  Fares: Ticket,
  PassengerServices: Headset,
  Interchange: ArrowsLeftRight,
  [KNOWLEDGEBASE_OVERVIEW_KEY]: Database,
  Staffing: Users,
  StationFacilities: Buildings,
}

export function getStationDetailsSectionIcon(
  tabId: StationDetailsTab | string,
  options?: { knowledgebaseSectionKey?: string | null; label?: string }
): Icon | null {
  if (typeof tabId === 'string' && isKnowledgebaseTabId(tabId)) {
    const key = options?.knowledgebaseSectionKey ?? parseKnowledgebaseTabId(tabId)
    if (key && KB_SECTION_ICON_BY_KEY[key]) return KB_SECTION_ICON_BY_KEY[key]
    if (options?.label) {
      const fromLabel = getStationDetailFieldIcon(options.label)
      if (fromLabel) return fromLabel
    }
    return Database
  }
  if (SECTION_ICON_BY_TAB[tabId]) return SECTION_ICON_BY_TAB[tabId]
  if (options?.label) {
    const lower = options.label.toLowerCase()
    if (lower.includes('toilet')) return Toilet
    if (lower.includes('lift')) return Buildings
    if (lower.includes('connection')) return ArrowsLeftRight
    if (lower.includes('step')) return Wheelchair
    if (lower.includes('staff')) return Users
  }
  return null
}

export function getKnowledgebaseSectionIcon(sectionKey: string, label?: string): Icon | null {
  if (KB_SECTION_ICON_BY_KEY[sectionKey]) return KB_SECTION_ICON_BY_KEY[sectionKey]
  return getStationDetailFieldIcon(label ?? sectionKey)
}
