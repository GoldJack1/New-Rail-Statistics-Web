/** ORR Table 1415 station usage time series (entries/exits + interchanges). */
export const GBNR_PASS_USAGE_DATA_COLLECTION = 'GBNR-PASS-USAGE-DATA' as const

export function gbnrPassUsageDocId(crsCode: string, nlc: string): string {
  return `${crsCode.trim().toUpperCase()}_${nlc.trim()}`
}

/**
 * NRE Knowledgebase often returns a 6-digit NLC (e.g. 513100) while ORR Table 1415
 * uses the 4-digit form (5131). Return candidates to try when resolving a doc id.
 */
export function orrNlcLookupCandidates(nlc: string): string[] {
  const raw = nlc.trim()
  if (!raw) return []
  const out: string[] = []
  const add = (value: string) => {
    if (value && !out.includes(value)) out.push(value)
  }
  add(raw)
  if (/^\d{6}$/.test(raw)) add(raw.slice(0, 4))
  return out
}

/** Doc id candidates for CRS + (possibly 6-digit) NLC. */
export function gbnrPassUsageDocIdCandidates(crsCode: string, nlc: string): string[] {
  const crs = crsCode.trim().toUpperCase()
  return orrNlcLookupCandidates(nlc).map((code) => gbnrPassUsageDocId(crs, code))
}
