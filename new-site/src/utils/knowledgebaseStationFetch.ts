import { parseKnowledgebaseStationXml, type KbJson } from './knowledgebaseStationXml'

export type KnowledgebaseFetchResult =
  | { status: 'ready'; crs: string; fetchedAt: string; data: KbJson }
  | { status: 'error'; message: string }

/** Session cache so page-load prefetch is reused when the Knowledgebase tab mounts. */
const kbSessionCache = new Map<string, KnowledgebaseFetchResult>()
const kbInflight = new Map<string, Promise<KnowledgebaseFetchResult>>()

export function normalizeKnowledgebaseCrs(crsCode: string | null | undefined): string {
  return String(crsCode || '')
    .trim()
    .toUpperCase()
}

export function isValidKnowledgebaseCrs(crs: string): boolean {
  return /^[A-Z0-9]{3}$/.test(crs)
}

export function getKnowledgebaseStationCache(crs: string): KnowledgebaseFetchResult | undefined {
  return kbSessionCache.get(crs)
}

export function loadKnowledgebaseStation(crs: string): Promise<KnowledgebaseFetchResult> {
  const cached = kbSessionCache.get(crs)
  if (cached) return Promise.resolve(cached)

  const existing = kbInflight.get(crs)
  if (existing) return existing

  const promise = fetch(`/api/knowledgebase/stations/${encodeURIComponent(crs)}`)
    .then(async (res) => {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        xml?: string
        crs?: string
        fetchedAt?: string
      }
      if (!res.ok) {
        throw new Error(body.message || body.error || `Request failed (${res.status})`)
      }
      if (!body.xml) throw new Error('No XML returned from Knowledgebase proxy')
      const data = parseKnowledgebaseStationXml(body.xml)
      const ready: Extract<KnowledgebaseFetchResult, { status: 'ready' }> = {
        status: 'ready',
        crs: body.crs || crs,
        fetchedAt: body.fetchedAt || new Date().toISOString(),
        data,
      }
      kbSessionCache.set(crs, ready)
      return ready
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to load Knowledgebase data'
      const failed: Extract<KnowledgebaseFetchResult, { status: 'error' }> = {
        status: 'error',
        message,
      }
      kbSessionCache.set(crs, failed)
      return failed
    })
    .finally(() => {
      kbInflight.delete(crs)
    })

  kbInflight.set(crs, promise)
  return promise
}
