import { doc, getDoc } from 'firebase/firestore'
import { GBNR_ODM_FLOWS_COLLECTION } from '@/constants/gbnrOdmFlows'
import { orrNlcLookupCandidates } from '@/constants/gbnrPassUsageData'
import { ensureFirebaseAppCheck, getFirebaseDB, initializeFirebase } from '@/services/firebase'

export type GbnrOdmDestination = {
  rank: number
  nlc: string
  stationName: string
  crsCode: string | null
  region: string | null
  localAuthority: string | null
  stationGroup: string | null
  journeys: number
}

export type GbnrOdmYearBucket = {
  financialYearLabel: string
  destinationCount: number | null
  topDestinations: GbnrOdmDestination[]
  bottomDestinations: GbnrOdmDestination[]
}

export type GbnrOdmFlowsDoc = {
  id: string
  nlc: string
  stationName: string
  crsCode: string | null
  region: string | null
  localAuthority: string | null
  stationGroup: string | null
  years: Record<string, GbnrOdmYearBucket>
  source: {
    table?: string
    topN?: number
    bottomN?: number
    files?: string[]
    importedAt?: unknown
  } | null
}

function normalizeCode(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s || s === '[z]' || s === '[x]') return null
  return s
}

function asDestination(raw: unknown): GbnrOdmDestination | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const nlc = normalizeCode(row.nlc)
  if (!nlc) return null
  const journeys =
    typeof row.journeys === 'number' && Number.isFinite(row.journeys)
      ? row.journeys
      : typeof row.journeys === 'string'
        ? Number(String(row.journeys).replace(/,/g, '').trim())
        : NaN
  if (!Number.isFinite(journeys)) return null
  const rank =
    typeof row.rank === 'number' && Number.isFinite(row.rank) ? row.rank : 0
  return {
    rank,
    nlc,
    stationName: String(row.stationName ?? ''),
    crsCode: normalizeCode(row.crsCode),
    region: normalizeCode(row.region),
    localAuthority: normalizeCode(row.localAuthority),
    stationGroup: normalizeCode(row.stationGroup),
    journeys,
  }
}

function asDestinationList(value: unknown): GbnrOdmDestination[] {
  if (!Array.isArray(value)) return []
  return value.map(asDestination).filter((row): row is GbnrOdmDestination => row != null)
}

function asYearBucket(value: unknown): GbnrOdmYearBucket | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const destinationCount =
    typeof row.destinationCount === 'number' && Number.isFinite(row.destinationCount)
      ? row.destinationCount
      : null
  return {
    financialYearLabel: String(row.financialYearLabel ?? ''),
    destinationCount,
    topDestinations: asDestinationList(row.topDestinations),
    bottomDestinations: asDestinationList(row.bottomDestinations),
  }
}

function mapOdmSnapshot(id: string, data: Record<string, unknown>): GbnrOdmFlowsDoc {
  const yearsRaw =
    data.years && typeof data.years === 'object' && !Array.isArray(data.years)
      ? (data.years as Record<string, unknown>)
      : {}
  const years: Record<string, GbnrOdmYearBucket> = {}
  for (const [year, bucket] of Object.entries(yearsRaw)) {
    if (!/^\d{4}$/.test(year)) continue
    const mapped = asYearBucket(bucket)
    if (mapped) years[year] = mapped
  }

  return {
    id,
    nlc: normalizeCode(data.nlc) || id,
    stationName: String(data.stationName ?? ''),
    crsCode: normalizeCode(data.crsCode),
    region: normalizeCode(data.region),
    localAuthority: normalizeCode(data.localAuthority),
    stationGroup: normalizeCode(data.stationGroup),
    years,
    source:
      data.source && typeof data.source === 'object' && !Array.isArray(data.source)
        ? (data.source as GbnrOdmFlowsDoc['source'])
        : null,
  }
}

/**
 * Fetch ODM top/bottom destinations for an origin station by NLC.
 * Tries Knowledgebase 6-digit form then ORR 4-digit form.
 */
export async function fetchGbnrOdmFlowsByNlc(
  nlc: string | null | undefined
): Promise<GbnrOdmFlowsDoc | null> {
  const nlcCode = normalizeCode(nlc)
  if (!nlcCode) return null

  await initializeFirebase()
  await ensureFirebaseAppCheck()
  const db = getFirebaseDB()
  if (!db) return null

  const candidates = orrNlcLookupCandidates(nlcCode)
  try {
    for (const id of candidates) {
      const snapshot = await getDoc(doc(db, GBNR_ODM_FLOWS_COLLECTION, id))
      if (!snapshot.exists()) continue
      return mapOdmSnapshot(snapshot.id, snapshot.data() as Record<string, unknown>)
    }
    return null
  } catch (error) {
    console.error('fetchGbnrOdmFlowsByNlc error:', error)
    return null
  }
}
