/**
 * Facility map keys that duplicate NRE Knowledgebase StationFacilities / CCTV.
 * Matching is case-insensitive and ignores non-alphanumerics.
 *
 * Confirmed from KB Stations XML v4 StationFacilities + Staffing/CCTV.
 */
const KB_OVERLAP_FACILITY_KEY_NORMALIZED = new Set([
  'wifi',
  'cctv',
  'atm',
  'atmmachine',
  'waitingroom',
  'seatedarea',
  'shops',
  'toilets',
  'babychange',
  'trolleys',
  'telephones',
  'postbox',
  'firstclasslounge',
  'stationbuffet',
  'buffet',
  'refreshments',
])

export function normalizeFacilityKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

export function isKnowledgebaseOverlapFacilityKey(key: string): boolean {
  return KB_OVERLAP_FACILITY_KEY_NORMALIZED.has(normalizeFacilityKey(key))
}

export function filterKnowledgebaseOverlapFacilityKeys(keys: string[]): string[] {
  return keys.filter((key) => !isKnowledgebaseOverlapFacilityKey(key))
}
