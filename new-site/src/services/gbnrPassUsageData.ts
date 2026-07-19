import { doc, getDoc } from 'firebase/firestore'
import {
  GBNR_PASS_USAGE_DATA_COLLECTION,
  gbnrPassUsageDocIdCandidates,
} from '@/constants/gbnrPassUsageData'
import { ensureFirebaseAppCheck, initializeFirebase, getFirebaseDB } from '@/services/firebase'
import type { YearlyPassengers } from '@/types'

export type GbnrPassUsageDoc = {
  id: string
  stationName: string
  crsCode: string | null
  nlc: string | null
  region: string | null
  localAuthority: string | null
  sort: number | null
  entriesExits: YearlyPassengers
  interchanges: YearlyPassengers
  source: {
    table: string
    periodLabel: string
    importedAt?: unknown
  } | null
}

function parseOrrPassengerYearValue(raw: unknown): number {
  if (raw === null || raw === undefined) return 0
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return 0
    // ORR Table 1415 markers for not applicable / suppressed / missing
    if (/^\[?[azx]\]?$/i.test(s) || s === '-' || s === '–' || s === '—') return 0
    const n = Number(s.replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function asYearlyMap(value: unknown): YearlyPassengers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: YearlyPassengers = {}
  for (const [year, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}$/.test(year)) continue
    // ORR released no 2003–2004 figures; never surface 2004 even if present as 0/null.
    if (year === '2004') continue
    out[year] = parseOrrPassengerYearValue(raw)
  }
  return out
}

function normalizeCode(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s || s === '[z]' || s === '[x]') return null
  return s
}

function mapPassUsageSnapshot(
  id: string,
  data: Record<string, unknown>
): GbnrPassUsageDoc {
  return {
    id,
    stationName: String(data.stationName ?? ''),
    crsCode: normalizeCode(data.crsCode),
    nlc: normalizeCode(data.nlc),
    region: normalizeCode(data.region),
    localAuthority: normalizeCode(data.localAuthority),
    sort: typeof data.sort === 'number' ? data.sort : null,
    entriesExits: asYearlyMap(data.entriesExits),
    interchanges: asYearlyMap(data.interchanges),
    source:
      data.source && typeof data.source === 'object' && !Array.isArray(data.source)
        ? (data.source as GbnrPassUsageDoc['source'])
        : null,
  }
}

/**
 * Fetch one ORR Table 1415 usage doc by CRS (TLC) + NLC.
 * Tries exact `{CRS}_{NLC}` then 4-digit NLC when Knowledgebase supplies a 6-digit code.
 */
export async function fetchGbnrPassUsageByCrsAndNlc(
  crsCode: string | null | undefined,
  nlc: string | null | undefined
): Promise<GbnrPassUsageDoc | null> {
  const crs = normalizeCode(crsCode)?.toUpperCase() ?? null
  const nlcCode = normalizeCode(nlc)
  if (!crs || !nlcCode) return null

  await initializeFirebase()
  await ensureFirebaseAppCheck()
  const db = getFirebaseDB()
  if (!db) return null

  const candidates = gbnrPassUsageDocIdCandidates(crs, nlcCode)
  try {
    for (const id of candidates) {
      const snapshot = await getDoc(doc(db, GBNR_PASS_USAGE_DATA_COLLECTION, id))
      if (!snapshot.exists()) continue
      return mapPassUsageSnapshot(snapshot.id, snapshot.data() as Record<string, unknown>)
    }
    return null
  } catch (error) {
    console.error('fetchGbnrPassUsageByCrsAndNlc error:', error)
    return null
  }
}
